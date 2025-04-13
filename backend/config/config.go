package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration
type Config struct {
	// Server
	GoAPIPort   string
	NodeAPIPort string
	FrontendURL string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// JWT
	JWTSecret              string
	JWTExpirationHours     time.Duration
	RefreshTokenSecret     string
	RefreshTokenExpiration time.Duration

	// Email
	EmailFrom     string
	EmailService  string
	EmailHost     string
	EmailPort     int
	EmailUser     string
	EmailPassword string

	// Storage
	StorageType string
	StoragePath string

	// AWS (if using S3)
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	AWSRegion          string
	AWSBucket          string

	// Environment
	Environment string
	LogLevel    string
}

// New creates a new Config instance from environment variables
func New() *Config {
	cfg := &Config{
		// Server
		GoAPIPort:   getEnv("GO_API_PORT", "8080"),
		NodeAPIPort: getEnv("NODE_API_PORT", "3001"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),

		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "safeballot"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		// JWT
		JWTSecret:              getEnv("JWT_SECRET", "default_jwt_secret_replace_this"),
		JWTExpirationHours:     time.Duration(getEnvAsInt("JWT_EXPIRATION_HOURS", 24)) * time.Hour,
		RefreshTokenSecret:     getEnv("REFRESH_TOKEN_SECRET", "default_refresh_token_secret_replace_this"),
		RefreshTokenExpiration: time.Duration(getEnvAsInt("REFRESH_TOKEN_EXPIRATION_DAYS", 7)) * 24 * time.Hour,

		// Email
		EmailFrom:     getEnv("EMAIL_FROM", "noreply@safeballot.com"),
		EmailService:  getEnv("EMAIL_SERVICE", "log"), // log, smtp, etc.
		EmailHost:     getEnv("EMAIL_HOST", ""),
		EmailPort:     getEnvAsInt("EMAIL_PORT", 587),
		EmailUser:     getEnv("EMAIL_USER", ""),
		EmailPassword: getEnv("EMAIL_PASSWORD", ""),

		// Storage
		StorageType: getEnv("STORAGE_TYPE", "local"),
		StoragePath: getEnv("STORAGE_PATH", "./uploads"),

		// AWS
		AWSAccessKeyID:     getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
		AWSRegion:          getEnv("AWS_REGION", ""),
		AWSBucket:          getEnv("AWS_BUCKET", ""),

		// Environment
		Environment: getEnv("GO_ENV", "development"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
	}

	return cfg
}

// IsDevelopment returns true if the environment is development
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// IsProduction returns true if the environment is production
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// Helper functions to get environment variables
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}
