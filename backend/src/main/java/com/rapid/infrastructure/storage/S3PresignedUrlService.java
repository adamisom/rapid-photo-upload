package com.rapid.infrastructure.storage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import java.time.Duration;
import java.util.UUID;

@Service
public class S3PresignedUrlService {
    
    @Autowired
    private S3Client s3Client;
    
    @Value("${aws.region}")
    private String awsRegion;
    
    @Value("${aws.accessKeyId}")
    private String accessKeyId;
    
    @Value("${aws.secretAccessKey}")
    private String secretAccessKey;
    
    @Value("${aws.s3.bucket}")
    private String bucketName;
    
    @Value("${s3.presigned-url-expiration-minutes}")
    private int expirationMinutes;
    
    public String generatePresignedPutUrl(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        
        PutObjectRequest putRequest = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();
        
        S3Presigner presigner = S3Presigner.builder()
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            ))
            .region(Region.of(awsRegion))
            .build();
        
        PutObjectPresignRequest presignedRequest = PutObjectPresignRequest.builder()
            .putObjectRequest(putRequest)
            .signatureDuration(Duration.ofMinutes(expirationMinutes))
            .build();
        
        PresignedPutObjectRequest presignedUrl = presigner.presignPutObject(presignedRequest);
        presigner.close();
        return presignedUrl.url().toString();
    }
    
    public boolean verifyFileExists(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        try {
            HeadObjectRequest request = HeadObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();
            
            s3Client.headObject(request);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }
    
    public long getFileSizeBytes(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        HeadObjectRequest request = HeadObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();
        
        HeadObjectResponse response = s3Client.headObject(request);
        return response.contentLength();
    }
    
    public void deleteFile(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        DeleteObjectRequest request = DeleteObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();
        
        s3Client.deleteObject(request);
    }
    
    public String generatePresignedGetUrl(String userId, String filename) {
        String s3Key = generateS3Key(userId, filename);
        
        GetObjectRequest getRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();
        
        S3Presigner presigner = S3Presigner.builder()
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            ))
            .region(Region.of(awsRegion))
            .build();
        
        GetObjectPresignRequest presignedRequest = GetObjectPresignRequest.builder()
            .getObjectRequest(getRequest)
            .signatureDuration(Duration.ofHours(1))
            .build();
        
        PresignedGetObjectRequest presignedUrl = presigner.presignGetObject(presignedRequest);
        presigner.close();
        return presignedUrl.url().toString();
    }
    
    private String generateS3Key(String userId, String filename) {
        String timestamp = System.currentTimeMillis() / 1000 + "";
        String uuid = UUID.randomUUID().toString();
        return userId + "/" + timestamp + "_" + uuid + "_" + filename;
    }
}

