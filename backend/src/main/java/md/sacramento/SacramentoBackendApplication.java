package md.sacramento;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SacramentoBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(SacramentoBackendApplication.class, args);
	}

}
