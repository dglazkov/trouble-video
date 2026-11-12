//! The product's server: its pages, served from memory by crux's part `server`, with nerd's feedback widget
//! (`widget`) in its table, each load of its pages measured (`load`), and the paths its pages send their telemetry
//! to (`telemetry`), on the port in `PORT`.

use std::sync::Arc;

use server::{Bytes, File, Site, Table};

const HTML: &str = "text/html; charset=utf-8";

/// The home page. The widget is loaded first in its `<head>`, so that it hears the console from the start, and
/// opened from the page's own Feedback; each load of it is measured by the script `load::tag` puts at the end of its
/// `<head>`, its view `home` (`home()`).
const HOME: &str = r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="/nerd-feedback.js"></script>
<title>Hello</title>
</head>
<body>
<h1>Hello</h1>
<p>A new product, served by crux.</p>
<footer><a href="" id="feedback">Feedback</a></footer>
<script>
document.getElementById("feedback").addEventListener("click", (e) => {
  e.preventDefault();
  nerdFeedback.open();
});
nerdFeedback.shortcut("Alt+Shift+F");
</script>
</body>
</html>
"#;

const NOT_FOUND: &str = r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not here</title>
</head>
<body>
<h1>Not here</h1>
<p><a href="/">Home</a></p>
</body>
</html>
"#;

/// The home page, its load measured.
fn home() -> String {
    HOME.replacen("</head>", &format!("{}</head>", load::tag("home")), 1)
}

/// Every file the product serves.
fn files() -> Vec<File> {
    vec![File::new("/", HTML, home().into()), widget::file()]
}

#[tokio::main]
async fn main() {
    let not_found = File::new("", HTML, Bytes::from_static(NOT_FOUND.as_bytes()));
    let site = Arc::new(Site::new(Table::build(files(), not_found)));
    let app = server::router(site).merge(telemetry::routes());
    if let Err(err) = server::serve(app).await {
        eprintln!("{err}");
        std::process::exit(1);
    }
}
