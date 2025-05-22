module github.com/safeballot/backend

go 1.21

require (
	github.com/dgrijalva/jwt-go v3.2.0+incompatible
	github.com/go-chi/chi/v5 v5.0.10
	github.com/go-chi/cors v1.2.1
	github.com/google/uuid v1.3.1
	github.com/joho/godotenv v1.5.1
	github.com/lib/pq v1.10.9
	golang.org/x/crypto v0.13.0
)

require github.com/stripe/stripe-go/v72 v72.122.0 // indirect
