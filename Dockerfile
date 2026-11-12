# The product's server: built here, then run alone in a small image, on the port in PORT. Written by nerd new from
# crux's scaffold (crux.toml's server); it is the product's now.
FROM docker.io/library/rust:1.98-slim-bookworm AS build
WORKDIR /src
# The dependencies and crux's parts first, against a main that does nothing, so that a change to the product's own
# code builds only it.
COPY Cargo.toml Cargo.lock ./
COPY crux crux
RUN mkdir src && echo 'fn main() {}' > src/main.rs \
 && cargo build --release --locked -p app \
 && rm -rf src
COPY src src
RUN touch src/main.rs && cargo build --release --locked -p app && cp target/release/app /app

FROM gcr.io/distroless/cc-debian12
COPY --from=build /app /app
CMD ["/app"]
