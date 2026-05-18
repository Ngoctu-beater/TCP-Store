package com.service.ordersservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class RestTemplateConfig {
    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();

        // Thêm bộ đánh chặn: Tự động đính kèm Token vào mọi request gọi đi
        restTemplate.getInterceptors().add((request, body, execution) -> {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                // Lấy Token từ request mà Admin đang gửi đến ordersservice
                String token = attributes.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
                if (token != null) {
                    // Nhét Token đó vào request gửi sang productservice
                    request.getHeaders().add(HttpHeaders.AUTHORIZATION, token);
                }
            }
            return execution.execute(request, body);
        });

        return restTemplate;
    }
}
