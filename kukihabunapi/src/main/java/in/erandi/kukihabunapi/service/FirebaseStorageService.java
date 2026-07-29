package in.erandi.kukihabunapi.service;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Bucket;
import com.google.firebase.cloud.StorageClient;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Shared image/file upload helper backed by Firebase Cloud Storage (migrated from AWS S3 after
 * the AWS account's free trial ended and locked out the bucket). Used by every controller/service
 * that previously talked to S3 directly (food images, offer images, profile pictures, refund
 * receipts) — centralized here since the upload/public-URL/delete logic is identical everywhere
 * it's used, unlike the small per-controller auth helpers duplicated elsewhere in this codebase.
 *
 * Requires the Storage bucket's rules to allow public reads (`allow read: if true;`) since these
 * URLs are meant to be viewed directly in <img> tags with no auth, same as the old public S3 URLs.
 */
@Service
public class FirebaseStorageService {

    public String upload(MultipartFile file, String folder) {
        try {
            String original = file.getOriginalFilename();
            String ext = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf('.') + 1) : "jpg";
            String path = folder + "/" + UUID.randomUUID() + "." + ext;

            Bucket bucket = StorageClient.getInstance().bucket();
            Blob blob = bucket.create(path, file.getBytes(), file.getContentType());

            return publicUrl(blob.getBucket(), path);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Image upload failed: " + e.getMessage());
        } catch (IllegalStateException e) {
            // FirebaseApp never initialized — most likely a missing/misconfigured service-account
            // credentials file, unlike phone verification this has no silent fallback.
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Image storage is not configured on this server: " + e.getMessage());
        }
    }

    public void delete(String publicUrl) {
        try {
            String path = pathFromUrl(publicUrl);
            Bucket bucket = StorageClient.getInstance().bucket();
            Blob blob = bucket.get(path);
            if (blob != null) blob.delete();
        } catch (Exception ignored) {
            // Best-effort cleanup, same as the old S3 delete helpers — a failure here shouldn't
            // block the caller's own operation (e.g. deleting a food item whose image is already gone).
        }
    }

    private String publicUrl(String bucketName, String path) {
        return "https://firebasestorage.googleapis.com/v0/b/" + bucketName + "/o/"
                + urlEncode(path) + "?alt=media";
    }

    private String pathFromUrl(String url) {
        String marker = "/o/";
        int start = url.indexOf(marker) + marker.length();
        int end = url.indexOf('?', start);
        String encoded = end >= 0 ? url.substring(start, end) : url.substring(start);
        return urlDecode(encoded);
    }

    private String urlEncode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.name());
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e); // UTF-8 is always supported
        }
    }

    private String urlDecode(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8.name());
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
