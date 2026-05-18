package com.service.ordersservice.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PayOSService {

    // Khai báo Logger thủ công để tránh lỗi Lombok "cannot find symbol variable log"
    private static final Logger log = LoggerFactory.getLogger(PayOSService.class);

    @Value("${payos.client-id}")
    private String clientId;

    @Value("${payos.api-key}")
    private String apiKey;

    @Value("${payos.checksum-key}")
    private String checksumKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    /**
     * Tạo Link thanh toán PayOS
     * @param stringOrderCode Mã đơn hàng dạng chuỗi (TCPS-...)
     * @param numericOrderCode Mã đơn hàng dạng số (ID)
     * @param amount Tổng số tiền
     * @return checkoutUrl
     */
    public String createPaymentLinkForMicroservice(String stringOrderCode, long numericOrderCode, long amount) {
        try {
            // 1. Chuẩn bị dữ liệu mô tả (Tối đa 25 ký tự)
            String description = "Thanh toan " + stringOrderCode;
            if (description.length() > 25) {
                description = description.substring(0, 25);
            }

            // 2. Thiết lập URL trả về (Gọi qua Gateway cổng 8080)
            // Gửi kèm stringOrderCode để Controller biết đơn hàng nào cần cập nhật
            String returnUrl = "http://localhost:8080/api/payment/payos/return?stringOrderCode=" + stringOrderCode;
            String cancelUrl = "http://localhost:8080/api/payment/payos/cancel?stringOrderCode=" + stringOrderCode;

            // 3. Tạo chữ ký (Signature) - Sắp xếp key theo thứ tự ABC
            SortedMap<String, String> signatureData = new TreeMap<>();
            signatureData.put("amount", String.valueOf(amount));
            signatureData.put("cancelUrl", cancelUrl);
            signatureData.put("description", description);
            signatureData.put("orderCode", String.valueOf(numericOrderCode));
            signatureData.put("returnUrl", returnUrl);

            String signatureQuery = buildQueryString(signatureData);
            String signature = generateHmacSHA256(signatureQuery, checksumKey);

            // 4. Tạo Body request JSON
            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("orderCode", numericOrderCode);
            requestBody.put("amount", amount);
            requestBody.put("description", description);
            requestBody.put("cancelUrl", cancelUrl);
            requestBody.put("returnUrl", returnUrl);
            requestBody.put("signature", signature);

            // 5. Cấu hình Headers và gửi Request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-client-id", clientId);
            headers.set("x-api-key", apiKey);

            HttpEntity<String> request = new HttpEntity<>(requestBody.toString(), headers);

            log.info("🚀 Đang gửi yêu cầu tạo link thanh toán cho đơn: {}", stringOrderCode);

            String apiResponse = restTemplate.postForObject(
                    "https://api-merchant.payos.vn/v2/payment-requests",
                    request,
                    String.class
            );

            // 6. Phân tích kết quả trả về
            JsonNode rootNode = objectMapper.readTree(apiResponse);
            String code = rootNode.path("code").asText();

            if (!"00".equals(code)) {
                log.error("❌ Lỗi từ hệ thống PayOS: {}", rootNode.path("desc").asText());
                throw new RuntimeException("PayOS Error: " + rootNode.path("desc").asText());
            }

            String checkoutUrl = rootNode.path("data").path("checkoutUrl").asText();
            log.info("✅ Tạo link PayOS thành công cho đơn: {}", stringOrderCode);

            return checkoutUrl;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            log.error("❌ Lỗi kết nối API PayOS: {}", responseBody);
            throw new RuntimeException("Lỗi cổng thanh toán: " + responseBody);
        } catch (Exception e) {
            log.error("❌ Lỗi hệ thống khi tạo link thanh toán: ", e);
            throw new RuntimeException("Lỗi hệ thống: " + e.getMessage());
        }
    }

    /**
     * Xây dựng chuỗi Query để tính mã Signature
     */
    private String buildQueryString(Map<String, String> data) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : data.entrySet()) {
            if (sb.length() > 0) sb.append("&");
            sb.append(entry.getKey()).append("=").append(entry.getValue());
        }
        return sb.toString();
    }

    /**
     * Tạo mã băm bảo mật HMAC-SHA256
     */
    private String generateHmacSHA256(String data, String key) throws Exception {
        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secret_key = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256_HMAC.init(secret_key);
        byte[] bytes = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));

        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}