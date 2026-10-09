
package com.skillswap.backend.config;

import com.skillswap.backend.calls.CallSignalingHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final CallSignalingHandler callSignalingHandler;

    public WebSocketConfig(
            CallSignalingHandler callSignalingHandler
    ) {
        this.callSignalingHandler = callSignalingHandler;
    }

    @Override
    public void registerWebSocketHandlers(
            WebSocketHandlerRegistry registry
    ) {
        registry
                .addHandler(
                        callSignalingHandler,
                        "/ws/calls"
                )
                .setAllowedOrigins(
                        "https://skillswap-o479.onrender.com",
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                        "http://localhost:8080",
                        "http://127.0.0.1:8080"
                );
    }
}
