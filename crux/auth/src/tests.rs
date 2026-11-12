//! The token check against a stand-in of Firebase's keys, and the session's cookie, as blog's
//! private page asked them (blog's `admin` test, lifted with it).
//!
//! The stand-in's shapes are from Google's references: the keys are JWKs (`kid`, `n`, `e`) under
//! `keys`, and an ID token's claims are Firebase's (`aud` the project, `iss`
//! `https://securetoken.google.com/PROJECT`, `email`, `email_verified`,
//! `firebase.sign_in_provider`).

use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::Engine;
use rsa::pkcs1::EncodeRsaPrivateKey;
use rsa::traits::PublicKeyParts;

use super::*;

const PROJECT: &str = "crux-test";
const ADDRESS: &str = "someone@example.com";

fn b64(bytes: &[u8]) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

/// An RSA key, to sign with and to publish as a JWK.
struct Key {
    signs: jsonwebtoken::EncodingKey,
    n: String,
    e: String,
}

fn key() -> Key {
    let k = rsa::RsaPrivateKey::new(&mut rsa::rand_core::OsRng, 2048).unwrap();
    Key {
        signs: jsonwebtoken::EncodingKey::from_rsa_der(k.to_pkcs1_der().unwrap().as_bytes()),
        n: b64(&k.n().to_bytes_be()),
        e: b64(&k.e().to_bytes_be()),
    }
}

/// The keys the stand-in publishes, by kid.
fn jwks(keys: &[(&str, &Key)]) -> String {
    let keys: Vec<_> = keys
        .iter()
        .map(|(kid, k)| {
            serde_json::json!({"kid": kid, "alg": "RS256", "kty": "RSA", "use": "sig", "n": k.n, "e": k.e})
        })
        .collect();
    serde_json::json!({ "keys": keys }).to_string()
}

/// The stand-in of Firebase's keys: what it publishes, and how often it was asked.
struct Firebase {
    url: String,
    jwks: Arc<Mutex<String>>,
    asked: Arc<AtomicUsize>,
}

fn firebase(jwks: String) -> Firebase {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}/keys", listener.local_addr().unwrap());
    let served = Arc::new(Mutex::new(jwks));
    let asked = Arc::new(AtomicUsize::new(0));
    let (s, a) = (served.clone(), asked.clone());
    std::thread::spawn(move || {
        for mut stream in listener.incoming().flatten() {
            let mut request = Vec::new();
            let mut buf = [0u8; 1024];
            while !request.windows(4).any(|w| w == b"\r\n\r\n") {
                match stream.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => request.extend_from_slice(&buf[..n]),
                }
            }
            a.fetch_add(1, Ordering::SeqCst);
            let body = s.lock().unwrap().clone();
            let _ = write!(
                stream,
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
        }
    });
    Firebase {
        url,
        jwks: served,
        asked,
    }
}

fn config(keys_url: &str) -> Config {
    Config {
        project: PROJECT.into(),
        addresses: vec![ADDRESS.into()],
        providers: vec!["google.com".into()],
        cookie: "__Host-crux-test".into(),
        session: Duration::from_secs(3600),
        keys_url: keys_url.into(),
    }
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

/// Claims as Firebase writes them for a Google sign-in of `email`.
fn claims(email: &str) -> serde_json::Value {
    serde_json::json!({
        "iss": format!("https://securetoken.google.com/{PROJECT}"),
        "aud": PROJECT,
        "auth_time": now() - 10,
        "user_id": "u1",
        "sub": "u1",
        "iat": now() - 10,
        "exp": now() + 3600,
        "email": email,
        "email_verified": true,
        "firebase": { "identities": { "google.com": ["1"], "email": [email] }, "sign_in_provider": "google.com" }
    })
}

fn with(f: &dyn Fn(&mut serde_json::Value)) -> serde_json::Value {
    let mut c = claims(ADDRESS);
    f(&mut c);
    c
}

fn sign(key: &Key, kid: &str, claims: &serde_json::Value) -> String {
    let mut h = jsonwebtoken::Header::new(Algorithm::RS256);
    h.kid = Some(kid.into());
    jsonwebtoken::encode(&h, claims, &key.signs).unwrap()
}

fn run<T>(f: impl std::future::Future<Output = T>) -> T {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(f)
}

#[test]
fn lets_in_the_one_address_and_refuses_every_other_way() {
    let (ours, stranger) = (key(), key());
    let fb = firebase(jwks(&[("k1", &ours)]));
    let auth = Auth::new(config(&fb.url));
    let token = |c: &serde_json::Value| sign(&ours, "k1", c);

    let mut refused: Vec<(&str, String, bool)> = Vec::new();
    let mut wrong = |what, token, invalid| refused.push((what, token, invalid));
    wrong(
        "another address",
        token(&claims("someone.else@example.com")),
        false,
    );
    wrong(
        "the same name elsewhere",
        token(&claims("someone@example.org")),
        false,
    );
    wrong(
        "an address that ends like it",
        token(&claims("x.someone@example.com")),
        false,
    );
    wrong(
        "an address not verified",
        token(&with(&|c| c["email_verified"] = false.into())),
        false,
    );
    wrong(
        "no address",
        token(&with(&|c| c["email"] = serde_json::Value::Null)),
        true,
    );
    wrong(
        "another provider",
        token(&with(&|c| {
            c["firebase"]["sign_in_provider"] = "password".into()
        })),
        false,
    );
    wrong(
        "no provider",
        token(&with(&|c| c["firebase"] = serde_json::json!({}))),
        false,
    );
    wrong(
        "for another project",
        token(&with(&|c| c["aud"] = "other-project".into())),
        true,
    );
    wrong(
        "from another issuer",
        token(&with(&|c| c["iss"] = "https://accounts.google.com".into())),
        true,
    );
    wrong(
        "lapsed",
        token(&with(&|c| c["exp"] = (now() - 3600).into())),
        true,
    );
    wrong(
        "with no expiry",
        token(&with(&|c| c["exp"] = serde_json::Value::Null)),
        true,
    );
    wrong(
        "signed by another key",
        sign(&stranger, "k1", &claims(ADDRESS)),
        true,
    );
    wrong(
        "by a key Firebase does not have",
        sign(&ours, "k9", &claims(ADDRESS)),
        true,
    );
    let good = token(&claims(ADDRESS));
    let parts: Vec<&str> = good.split('.').collect();
    let none = format!(
        "{}.{}.",
        b64(br#"{"alg":"none","typ":"JWT","kid":"k1"}"#),
        parts[1]
    );
    wrong("not signed at all", none, true);
    let hs = format!(
        "{}.{}.{}",
        b64(br#"{"alg":"HS256","typ":"JWT","kid":"k1"}"#),
        parts[1],
        parts[2]
    );
    wrong("claiming another algorithm", hs, true);
    let other = b64(claims("someone.else@example.com").to_string().as_bytes());
    wrong(
        "its claims changed after signing",
        format!("{}.{other}.{}", parts[0], parts[2]),
        true,
    );
    wrong("not a token", "nonsense".into(), true);

    run(async {
        for (what, token, invalid) in &refused {
            match auth.check(token).await {
                Err(Refused::Invalid(_)) if *invalid => {}
                Err(Refused::NotLetIn) if !*invalid => {}
                r => panic!("{what}: {r:?}"),
            }
            // verify refuses what is not Firebase's for the project, and gives the claims of
            // a good token for someone not let in.
            match auth.verify(token).await {
                Err(Refused::Invalid(_)) if *invalid => {}
                Ok(_) if !*invalid => {}
                r => panic!("{what}, verified: {r:?}"),
            }
        }
        // The one address, signed in with Google, is let in, however it is written.
        assert_eq!(auth.check(&good).await, Ok(ADDRESS.into()));
        let upper = token(&claims("Someone@Example.COM"));
        assert_eq!(auth.check(&upper).await, Ok("Someone@Example.COM".into()));
    });
}

#[test]
fn lets_in_each_address_and_provider_the_product_names() {
    let ours = key();
    let fb = firebase(jwks(&[("k1", &ours)]));
    let auth = Auth::new(Config {
        addresses: vec![
            " Someone@Example.com ".into(),
            "other@example.org".into(),
            "".into(),
        ],
        providers: vec!["google.com".into(), "password".into()],
        ..config(&fb.url)
    });
    let password = |email: &str| {
        let mut c = claims(email);
        c["firebase"]["sign_in_provider"] = "password".into();
        sign(&ours, "k1", &c)
    };
    run(async {
        assert_eq!(
            auth.check(&sign(&ours, "k1", &claims(ADDRESS))).await,
            Ok(ADDRESS.into())
        );
        assert_eq!(
            auth.check(&password("other@example.org")).await,
            Ok("other@example.org".into())
        );
        assert_eq!(
            auth.check(&password("third@example.org")).await,
            Err(Refused::NotLetIn)
        );
        let mut phone = claims(ADDRESS);
        phone["firebase"]["sign_in_provider"] = "phone".into();
        assert_eq!(
            auth.check(&sign(&ours, "k1", &phone)).await,
            Err(Refused::NotLetIn)
        );
    });
}

#[test]
fn lets_in_a_verified_address_of_a_domain_the_product_names() {
    // grocery-run's: anyone Google says has a verified @glazkov.com address (crux#72), beside the
    // one address listed.
    let ours = key();
    let fb = firebase(jwks(&[("k1", &ours)]));
    let auth = Auth::new(config(&fb.url)).with_domains([" Glazkov.COM ", ""]);
    assert_eq!(auth.domains(), ["glazkov.com"]);
    let token = |email: &str| sign(&ours, "k1", &claims(email));
    run(async {
        for email in ["dimitri@glazkov.com", "Someone.Else@GLAZKOV.com"] {
            assert_eq!(auth.check(&token(email)).await, Ok(email.into()), "{email}");
        }
        assert_eq!(
            auth.check(&token(ADDRESS)).await,
            Ok(ADDRESS.into()),
            "the listed address, still"
        );
        let mut unverified = claims("dimitri@glazkov.com");
        unverified["email_verified"] = false.into();
        let mut password = claims("dimitri@glazkov.com");
        password["firebase"]["sign_in_provider"] = "password".into();
        for (what, token) in [
            ("not verified", sign(&ours, "k1", &unverified)),
            ("another provider", sign(&ours, "k1", &password)),
            ("a name that ends like it", token("x@evilglazkov.com")),
            (
                "the domain, and another after it",
                token("x@glazkov.com.evil.com"),
            ),
            ("a domain under it", token("x@sub.glazkov.com")),
            ("the domain alone", token("@glazkov.com")),
            ("the domain, no @", token("glazkov.com")),
            ("neither listed nor of it", token("someone@example.org")),
        ] {
            assert_eq!(auth.check(&token).await, Err(Refused::NotLetIn), "{what}");
        }
    });

    // A domain alone lets in, as `@glazkov.com` too, with no address listed.
    let domain = Auth::new(Config {
        addresses: vec![],
        ..config(&fb.url)
    })
    .with_domains(vec!["@glazkov.com".to_string()]);
    run(async {
        assert_eq!(
            domain.check(&token("dimitri@glazkov.com")).await,
            Ok("dimitri@glazkov.com".into())
        );
        assert_eq!(domain.check(&token(ADDRESS)).await, Err(Refused::NotLetIn));
    });
}

#[test]
fn gives_a_checked_tokens_claims() {
    // nerd's tracker's (crux#81): the person's uid, and a machine's custom sign-in, `machine:NAME`
    // with its claim `account`, which no address lets in.
    let ours = key();
    let fb = firebase(jwks(&[("k1", &ours)]));
    let auth = Auth::new(config(&fb.url));
    let person = claims(ADDRESS);
    let machine = serde_json::json!({
        "iss": format!("https://securetoken.google.com/{PROJECT}"),
        "aud": PROJECT,
        "auth_time": now() - 10,
        "user_id": "machine:box",
        "sub": "machine:box",
        "iat": now() - 10,
        "exp": now() + 3600,
        "account": "u1",
        "firebase": { "identities": {}, "sign_in_provider": "custom" }
    });
    let object = |v: &serde_json::Value| v.as_object().unwrap().clone();
    run(async {
        let want = Token {
            uid: "u1".into(),
            email: ADDRESS.into(),
            email_verified: true,
            provider: "google.com".into(),
            claims: object(&person),
        };
        let token = sign(&ours, "k1", &person);
        assert_eq!(auth.verify(&token).await, Ok(want.clone()));
        assert_eq!(auth.admit(&token).await, Ok(want), "admitted, the same");

        let token = sign(&ours, "k1", &machine);
        let got = auth.verify(&token).await.unwrap();
        assert_eq!(
            got,
            Token {
                uid: "machine:box".into(),
                email: "".into(),
                email_verified: false,
                provider: "custom".into(),
                claims: object(&machine),
            }
        );
        assert_eq!(got.claims["account"], "u1");
        assert_eq!(auth.admit(&token).await, Err(Refused::NotLetIn));
        assert_eq!(auth.check(&token).await, Err(Refused::NotLetIn));

        let mut odd = person.clone();
        odd["sub"] = 7.into();
        assert!(
            matches!(
                auth.verify(&sign(&ours, "k1", &odd)).await,
                Err(Refused::Invalid(_))
            ),
            "a uid that is not a string"
        );
    });

    // With no one to let in, a token is verified still, as a machine's is; it is admitted by no one.
    let no_one = Auth::new(Config {
        addresses: vec![],
        ..config(&fb.url)
    });
    run(async {
        let token = sign(&ours, "k1", &machine);
        assert_eq!(no_one.verify(&token).await.unwrap().uid, "machine:box");
        assert!(matches!(
            no_one.admit(&token).await,
            Err(Refused::Unready(_))
        ));
    });
}

#[test]
fn reads_the_keys_again_once_for_a_kid_not_yet_seen() {
    let (first, next) = (key(), key());
    let fb = firebase(jwks(&[("k1", &first)]));
    let auth = Auth::new(config(&fb.url));
    run(async {
        let good = sign(&first, "k1", &claims(ADDRESS));
        assert_eq!(auth.check(&good).await, Ok(ADDRESS.into()));
        assert_eq!(auth.check(&good).await, Ok(ADDRESS.into()));
        assert_eq!(
            fb.asked.load(Ordering::SeqCst),
            1,
            "a kid seen is not read again"
        );

        // A kid Firebase does not have is read for once, and refused.
        let unknown = sign(&next, "k2", &claims(ADDRESS));
        assert!(matches!(
            auth.check(&unknown).await,
            Err(Refused::Invalid(_))
        ));
        assert_eq!(fb.asked.load(Ordering::SeqCst), 2);

        // Firebase changes its keys: the new kid is found as it is first seen.
        *fb.jwks.lock().unwrap() = jwks(&[("k1", &first), ("k2", &next)]);
        assert_eq!(auth.check(&unknown).await, Ok(ADDRESS.into()));
        assert_eq!(fb.asked.load(Ordering::SeqCst), 3);
        assert_eq!(auth.check(&unknown).await, Ok(ADDRESS.into()));
        assert_eq!(auth.check(&good).await, Ok(ADDRESS.into()));
        assert_eq!(fb.asked.load(Ordering::SeqCst), 3);
    });
}

#[test]
fn is_unready_with_no_one_to_let_in_or_no_keys() {
    let ours = key();
    let token = sign(&ours, "k1", &claims(ADDRESS));
    let fb = firebase(jwks(&[("k1", &ours)]));
    let no_one = Auth::new(Config {
        addresses: vec![" ".into()],
        ..config(&fb.url)
    })
    .with_domains([" ", "@"]);
    // Nothing listens where the keys are said to be.
    let gone = TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap();
    let no_keys = Auth::new(config(&format!("http://{gone}/keys")));
    let not_keys = firebase("<html>not keys</html>".into());
    let unreadable = Auth::new(config(&not_keys.url));
    run(async {
        for (what, auth) in [
            ("no one", &no_one),
            ("no keys", &no_keys),
            ("not keys", &unreadable),
        ] {
            assert!(
                matches!(auth.check(&token).await, Err(Refused::Unready(_))),
                "{what}"
            );
        }
    });
    assert_eq!(
        fb.asked.load(Ordering::SeqCst),
        0,
        "with no one to let in, nothing is read"
    );
}

#[test]
fn a_session_is_read_back_from_its_cookie_and_closed() {
    let auth = Auth::new(config("http://127.0.0.1:9/keys"));
    assert!(!auth.signed_in(""), "without a session");
    assert!(
        !auth.signed_in("__Host-crux-test=0123456789abcdef"),
        "a made-up session"
    );

    let id = auth.open();
    assert_eq!(id.len(), 64);
    assert!(id.bytes().all(|b| b.is_ascii_hexdigit()));
    assert_ne!(id, auth.open(), "each session has a name of its own");

    let set = auth.set_cookie(&id);
    assert!(set.starts_with(&format!("__Host-crux-test={id};")), "{set}");
    for attr in [
        "Path=/",
        "Max-Age=3600",
        "Secure",
        "HttpOnly",
        "SameSite=Strict",
    ] {
        assert!(set.split("; ").any(|a| a == attr), "{attr} in {set}");
    }
    assert!(
        !set.contains("Domain"),
        "a __Host- cookie names no domain: {set}"
    );

    let header = format!("theme=dark; __Host-crux-test={id}; other=1");
    assert!(auth.signed_in(&header));
    assert!(
        !auth.signed_in(&format!("__Host-other={id}")),
        "under another name"
    );
    assert!(
        !auth.signed_in(&format!("x__Host-crux-test={id}")),
        "under a name that ends like it"
    );
    assert!(!auth.signed_in("__Host-crux-test="), "empty");

    // Closing it ends it, and its Set-Cookie ends the cookie.
    auth.close(&header);
    assert!(!auth.signed_in(&header));
    let end = auth.set_cookie("");
    assert!(
        end.starts_with("__Host-crux-test=;") && end.contains("Max-Age=0"),
        "{end}"
    );

    // Another instance knows none of this one's sessions.
    let other = Auth::new(config("http://127.0.0.1:9/keys"));
    let id = auth.open();
    assert!(auth.signed_in(&format!("__Host-crux-test={id}")));
    assert!(!other.signed_in(&format!("__Host-crux-test={id}")));
}

#[test]
fn a_session_lapses_after_the_time_the_product_gives() {
    // A session of no time has lapsed as it opens; one of an hour has not.
    let lapsed = Auth::new(Config {
        session: Duration::ZERO,
        ..config("http://127.0.0.1:9/keys")
    });
    let id = lapsed.open();
    assert!(!lapsed.signed_in(&format!("__Host-crux-test={id}")));
    assert!(lapsed.set_cookie(&id).contains("Max-Age=0"));

    let auth = Auth::new(Config {
        session: Duration::from_secs(7 * 86400),
        ..config("")
    });
    let id = auth.open();
    assert!(auth.signed_in(&format!("__Host-crux-test={id}")));
    assert!(auth
        .set_cookie(&id)
        .contains(&format!("Max-Age={}", 7 * 86400)));
}

#[test]
fn the_cookie_is_the_sites_alone() {
    for name in [
        "crux-test",
        "__Secure-crux-test",
        "__Host-",
        "__host-crux-test",
    ] {
        let made = std::panic::catch_unwind(|| {
            Auth::new(Config {
                cookie: name.into(),
                ..config("")
            })
        });
        assert!(made.is_err(), "{name} was taken");
    }
}
