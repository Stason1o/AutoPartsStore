package md.sacramento.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AuthController {

    /** Задержка ответа при неверном пароле — против перебора. */
    private static final long FAILED_LOGIN_DELAY_MS = 800;

    private final AuthenticationManager authenticationManager;
    private final AdminUserRepository adminUsers;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(AuthenticationManager authenticationManager, AdminUserRepository adminUsers,
                          org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.adminUsers = adminUsers;
        this.passwordEncoder = passwordEncoder;
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest body,
                                   HttpServletRequest request, HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(body.username(), body.password()));
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            contextRepository.saveContext(context, request, response);
            return ResponseEntity.ok(Map.of("username", authentication.getName()));
        } catch (AuthenticationException e) {
            try {
                Thread.sleep(FAILED_LOGIN_DELAY_MS);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Неверный логин или пароль"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @GetMapping("/me")
    public Map<String, String> me(Authentication authentication) {
        return Map.of("username", authentication.getName());
    }

    public record PasswordChangeRequest(@NotBlank String currentPassword,
                                        @NotBlank @jakarta.validation.constraints.Size(min = 10)
                                        String newPassword) {
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@jakarta.validation.Valid @RequestBody PasswordChangeRequest body,
                                            Authentication authentication) {
        AdminUser user = adminUsers.findByUsername(authentication.getName()).orElseThrow();
        if (!passwordEncoder.matches(body.currentPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Текущий пароль неверен"));
        }
        user.setPasswordHash(passwordEncoder.encode(body.newPassword()));
        adminUsers.save(user);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
