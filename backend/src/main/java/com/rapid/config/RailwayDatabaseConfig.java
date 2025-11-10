package com.rapid.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.jdbc.DataSourceBuilder;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * Parse Railway's DATABASE_URL and create DataSource
 * Railway format: postgresql://user:pass@host:port/dbname
 * Spring needs: jdbc:postgresql://host:port/dbname
 */
@Configuration
public class RailwayDatabaseConfig {

    @Bean
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        
        // If DATABASE_URL exists (Railway), parse it
        if (databaseUrl != null && !databaseUrl.isEmpty()) {
            try {
                // Remove any query parameters
                String cleanUrl = databaseUrl.split("\\?")[0];
                
                URI dbUri = new URI(cleanUrl);
                
                String username = dbUri.getUserInfo().split(":")[0];
                String password = dbUri.getUserInfo().split(":")[1];
                String host = dbUri.getHost();
                int port = dbUri.getPort();
                String dbName = dbUri.getPath().substring(1); // Remove leading /
                
                String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", host, port, dbName);
                
                System.out.println("🗄️  Connecting to PostgreSQL via DATABASE_URL");
                System.out.println("   Host: " + host + ":" + port);
                System.out.println("   Database: " + dbName);
                
                return DataSourceBuilder
                        .create()
                        .url(jdbcUrl)
                        .username(username)
                        .password(password)
                        .driverClassName("org.postgresql.Driver")
                        .build();
                        
            } catch (URISyntaxException | ArrayIndexOutOfBoundsException e) {
                System.err.println("❌ Failed to parse DATABASE_URL: " + e.getMessage());
                throw new RuntimeException("Invalid DATABASE_URL format", e);
            }
        }
        
        // Fall back to Spring Boot's default configuration (local dev)
        System.out.println("🗄️  Using default datasource configuration (local dev)");
        return DataSourceBuilder.create().build();
    }
}

