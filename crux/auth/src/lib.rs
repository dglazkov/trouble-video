//! Who may sign in to a product through Firebase (`nerd guide firebase`): the addresses, the
//! domains and the providers the product names, and no one else.
//!
//! The page signs in through Firebase, and sends the ID token Firebase gives it. The server takes
//! it only where Google's key signed it (RS256, by the `kid` it names, from the keys Firebase
//! publishes, read again once for a `kid` not yet seen), for the product's Firebase project (`aud`,
//! `iss`), not lapsed, for a verified address the product lets in, signed in with a provider it
//! names. An address is let in where the product lists it, or where it ends in `@` and a domain the
//! product names ([`Auth::with_domains`]), in any case: `glazkov.com` lets in `x@glazkov.com`, and
//! not `x@sub.glazkov.com` nor `x@evilglazkov.com`. It answers with a session: a random name in a
//! `__Host-` cookie only the server can read back, which lapses after the time the product gives,
//! or when the instance stops.
//!
//! Where a product needs more of a token than its address, [`Auth::admit`] gives its claims (its
//! uid, its provider and the rest), and [`Auth::verify`] gives them for a token of anyone's, as a
//! machine's custom sign-in, for the product to judge itself (crux#81, for nerd's tracker).
//!
//! Lifted from blog's private page (crux#4), where it let in one `ADMIN_EMAIL`; the domains are
//! grocery-run's, which lets in anyone Google says has a verified @glazkov.com address (crux#72).

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use jsonwebtoken::{Algorithm, DecodingKey, Validation};
use serde::Deserialize;

/// The keys Firebase signs ID tokens with, as JWKs.
pub const KEYS: &str =
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

/// What a product lets in, and how its sessions go.
#[derive(Clone, Debug)]
pub struct Config {
    /// The Firebase project the tokens are for.
    pub project: String,
    /// The addresses let in, in any case; none, and no domain ([`Auth::with_domains`]), lets no one
    /// in.
    pub addresses: Vec<String>,
    /// The sign-in providers let in, as Firebase names them (`google.com`, `password`, …).
    pub providers: Vec<String>,
    /// The session's cookie: it must begin `__Host-`, so that it is the site's alone, sent over
    /// HTTPS only.
    pub cookie: String,
    /// How long a session stands.
    pub session: Duration,
    /// Where Firebase's keys are read: [`KEYS`], but for a test's stand-in.
    pub keys_url: String,
}

#[derive(Deserialize, Clone)]
struct Jwk {
    kid: String,
    n: String,
    e: String,
}

#[derive(Deserialize)]
struct Jwks {
    keys: Vec<Jwk>,
}

/// A token's claims, once Google's key signed it for the product's project and it has not lapsed
/// ([`Auth::verify`]): those Firebase writes for every sign-in, and all of them as they came,
/// a custom sign-in's own among them.
#[derive(Clone, Debug, PartialEq)]
pub struct Token {
    /// Its `sub`: the user's uid, or the uid a custom sign-in gave.
    pub uid: String,
    /// Its `email`, empty where it has none, as a custom sign-in's.
    pub email: String,
    pub email_verified: bool,
    /// Its `firebase.sign_in_provider`: `google.com`, `password`, `custom`, …; empty where it has none.
    pub provider: String,
    /// Every claim, as the token has it.
    pub claims: serde_json::Map<String, serde_json::Value>,
}

#[derive(Deserialize)]
struct Claims {
    sub: String,
    #[serde(default)]
    email: String,
    #[serde(default)]
    email_verified: bool,
    #[serde(default)]
    firebase: Firebase,
}

#[derive(Deserialize, Default)]
struct Firebase {
    #[serde(default)]
    sign_in_provider: String,
}

/// Why a token was refused, to say to the page.
#[derive(Debug, PartialEq)]
pub enum Refused {
    /// Not a token Firebase signed for this project, or one that has lapsed.
    Invalid(String),
    /// A good token, for someone the product does not let in.
    NotLetIn,
    /// The server knows no one to let in, or cannot read the keys.
    Unready(String),
}

pub struct Auth {
    config: Config,
    domains: Vec<String>,
    client: reqwest::Client,
    keys: Mutex<Option<(Vec<Jwk>, Instant)>>,
    sessions: Mutex<HashMap<String, Instant>>,
}

impl Auth {
    /// Panics where the cookie's name does not begin `__Host-`.
    pub fn new(mut config: Config) -> Auth {
        assert!(
            config.cookie.starts_with("__Host-") && config.cookie.len() > "__Host-".len(),
            "the session's cookie is named __Host-NAME, not {:?}",
            config.cookie
        );
        config.addresses = config
            .addresses
            .iter()
            .map(|a| a.trim().to_ascii_lowercase())
            .filter(|a| !a.is_empty())
            .collect();
        Auth {
            config,
            domains: Vec::new(),
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap(),
            keys: Mutex::new(None),
            sessions: Mutex::new(HashMap::new()),
        }
    }

    /// Lets in, beside the listed addresses, every verified address of each domain (`glazkov.com`,
    /// or `@glazkov.com`), in any case: only the domain itself, not one under it. A method, not a
    /// field of [`Config`], so that a `Config` built before it builds as it did.
    pub fn with_domains<D: AsRef<str>>(mut self, domains: impl IntoIterator<Item = D>) -> Auth {
        self.domains = domains
            .into_iter()
            .map(|d| {
                d.as_ref()
                    .trim()
                    .trim_start_matches('@')
                    .to_ascii_lowercase()
            })
            .filter(|d| !d.is_empty())
            .collect();
        self
    }

    pub fn config(&self) -> &Config {
        &self.config
    }

    /// The domains let in, as [`Auth::with_domains`] named them.
    pub fn domains(&self) -> &[String] {
        &self.domains
    }

    /// Whether the address is listed, or of a domain named.
    fn lets_in(&self, email: &str) -> bool {
        let email = email.to_ascii_lowercase();
        if self.config.addresses.contains(&email) {
            return true;
        }
        email.rsplit_once('@').is_some_and(|(name, domain)| {
            !name.is_empty() && self.domains.iter().any(|d| d == domain)
        })
    }

    /// Firebase's keys, read again an hour after they were last read.
    async fn keys(&self, again: bool) -> Result<Vec<Jwk>, Refused> {
        if !again {
            if let Some((k, at)) = &*self.keys.lock().unwrap() {
                if at.elapsed() < Duration::from_secs(3600) {
                    return Ok(k.clone());
                }
            }
        }
        let fail = |e: String| Refused::Unready(format!("Firebase's keys: {e}"));
        let r = self
            .client
            .get(&self.config.keys_url)
            .send()
            .await
            .map_err(|e| fail(e.to_string()))?;
        if !r.status().is_success() {
            return Err(fail(r.status().to_string()));
        }
        let body = r.bytes().await.map_err(|e| fail(e.to_string()))?;
        let jwks: Jwks = serde_json::from_slice(&body).map_err(|e| fail(e.to_string()))?;
        *self.keys.lock().unwrap() = Some((jwks.keys.clone(), Instant::now()));
        Ok(jwks.keys)
    }

    /// The token's claims, where Google's key signed it (RS256, by its `kid`) for the product's
    /// project, and it has not lapsed: whoever it is for, as this says nothing of who is let in
    /// ([`Auth::admit`]).
    pub async fn verify(&self, token: &str) -> Result<Token, Refused> {
        let header =
            jsonwebtoken::decode_header(token).map_err(|e| Refused::Invalid(e.to_string()))?;
        if header.alg != Algorithm::RS256 {
            return Err(Refused::Invalid(format!("signed with {:?}", header.alg)));
        }
        let kid = header
            .kid
            .ok_or_else(|| Refused::Invalid("no kid".into()))?;
        let mut key = self.keys(false).await?.into_iter().find(|k| k.kid == kid);
        if key.is_none() {
            // Firebase changes its keys every few days: a kid not yet seen may be a new one.
            key = self.keys(true).await?.into_iter().find(|k| k.kid == kid);
        }
        let key = key.ok_or_else(|| Refused::Invalid(format!("no key {kid}")))?;
        let key = DecodingKey::from_rsa_components(&key.n, &key.e)
            .map_err(|e| Refused::Invalid(e.to_string()))?;
        let project = &self.config.project;
        let mut v = Validation::new(Algorithm::RS256);
        v.set_audience(&[project]);
        v.set_issuer(&[format!("https://securetoken.google.com/{project}")]);
        v.set_required_spec_claims(&["exp", "iat", "sub", "aud", "iss"]);
        v.leeway = 60;
        let claims =
            jsonwebtoken::decode::<serde_json::Map<String, serde_json::Value>>(token, &key, &v)
                .map_err(|e| Refused::Invalid(e.to_string()))?
                .claims;
        let c: Claims = serde_json::from_value(serde_json::Value::Object(claims.clone()))
            .map_err(|e| Refused::Invalid(e.to_string()))?;
        Ok(Token {
            uid: c.sub,
            email: c.email,
            email_verified: c.email_verified,
            provider: c.firebase.sign_in_provider,
            claims,
        })
    }

    /// The token's claims, where it is [verified](Auth::verify) and for a verified address the
    /// product lets in, signed in with a provider it names.
    pub async fn admit(&self, token: &str) -> Result<Token, Refused> {
        if self.config.addresses.is_empty() && self.domains.is_empty() {
            return Err(Refused::Unready("no address is let in".into()));
        }
        let t = self.verify(token).await?;
        if !self.lets_in(&t.email)
            || !t.email_verified
            || !self.config.providers.contains(&t.provider)
        {
            return Err(Refused::NotLetIn);
        }
        Ok(t)
    }

    /// The token's address, where it is one let in ([`Auth::admit`]).
    pub async fn check(&self, token: &str) -> Result<String, Refused> {
        self.admit(token).await.map(|t| t.email)
    }

    /// A new session's name, for the cookie.
    pub fn open(&self) -> String {
        let id = random();
        let mut s = self.sessions.lock().unwrap();
        s.retain(|_, at| at.elapsed() < self.config.session);
        s.insert(id.clone(), Instant::now());
        id
    }

    /// Whether the request's cookie names a session that stands.
    pub fn signed_in(&self, cookie_header: &str) -> bool {
        let Some(id) = cookie(cookie_header, &self.config.cookie) else {
            return false;
        };
        self.sessions
            .lock()
            .unwrap()
            .get(id)
            .is_some_and(|at| at.elapsed() < self.config.session)
    }

    pub fn close(&self, cookie_header: &str) {
        if let Some(id) = cookie(cookie_header, &self.config.cookie) {
            self.sessions.lock().unwrap().remove(id);
        }
    }

    /// The Set-Cookie for a session, or for none (`id` empty), which ends it.
    pub fn set_cookie(&self, id: &str) -> String {
        let age = if id.is_empty() {
            0
        } else {
            self.config.session.as_secs()
        };
        let name = &self.config.cookie;
        format!("{name}={id}; Path=/; Max-Age={age}; Secure; HttpOnly; SameSite=Strict")
    }
}

/// The value of the cookie `name` in a Cookie header.
fn cookie<'a>(header: &'a str, name: &str) -> Option<&'a str> {
    header.split(';').find_map(|part| {
        let (k, v) = part.trim().split_once('=')?;
        (k == name && !v.is_empty()).then_some(v)
    })
}

/// 256 random bits, in hex: a name no one can guess.
pub fn random() -> String {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("the system's randomness");
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests;
