package com.service.productservice.controller;

import com.service.productservice.service.ChatbotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatbotController {
    @Autowired
    private ChatbotService chatbotService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> chatWithBot(@RequestBody Map<String, Object> request) {
        String message = (String) request.get("message");

        String userName = request.get("userName") != null ? (String) request.get("userName") : "";

        return ResponseEntity.ok(chatbotService.processMessage(message, userName));
    }
}
