package com.sgdts.sgdts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SgdtsApplication {

	public static void main(String[] args) {
		SpringApplication.run(SgdtsApplication.class, args);
	}

}
