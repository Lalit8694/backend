package com.example.assignment.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

import com.example.assignment.model.UserDtls;
import com.example.assignment.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
public class ControllerHomePage {
	
	@Autowired
	private UserService userService;
	
	@GetMapping("/")
	public String index() {
		return "index";
	}
	
	@GetMapping("/dataEntry")
	public String dataEntry() {
		return "dataEntry";
	}
	
	@GetMapping("/signin")
	public String verifyUser() {
		return "verifyUser";
	}
	
	@PostMapping("/createUser")
	public String createuser(@ModelAttribute UserDtls user, HttpSession session) {
		
		//System.out.println(user.toString());
		
		boolean f= userService.checkName(user.getFullName());
		if(f) {
			//System.out.println("Name is already exist");
			session.setAttribute("msg", "Name alrready exist");
		}else {
			UserDtls userDtls=userService.createUser(user);
			if(userDtls != null) {
				//System.out.println("Register Successfully");
				session.setAttribute("msg", "Register Successfully");
			}else {
				//System.out.println("server error");
				session.setAttribute("msg", "something went wrong");
			}
		}
		
		
		
		
		return "redirect:/dataEntry";
	}
	

}
//ControllerHome



package com.example.assignment.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/user")
public class UserController {
	@GetMapping("/")
	public String home() {
		return "user/home";
	}
}
//UserController

package com.example.assignment.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString; 


@Data
@Entity
public class UserDtls {
	
 @Id
 @GeneratedValue(strategy = GenerationType.IDENTITY)
 private Integer id;
 private String fullName;
 private String password;
 private String role;
public Integer getId() {
	return id;
}
public void setId(Integer id) {
	this.id = id;
}
public String getFullName() {
	return fullName;
}
public void setFullName(String fullName) {
	this.fullName = fullName;
}
public String getPassword() {
	return password;
}
public void setPassword(String password) {
	this.password = password;
}
public String getRole() {
	return role;
}
public void setRole(String role) {
	this.role = role;
}
 
 
 
 


 
 
}
//UserDtls


package com.example.assignment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.assignment.model.UserDtls;

public interface UserRepository extends JpaRepository<UserDtls, Integer> {
public boolean existsByFullName(String fullName);
public UserDtls findByFullName(String fullName);
}
//UserRepository


package com.example.assignment.security.config;
import org.springframework.security.core.userdetails.UserDetails;

import com.example.assignment.model.UserDtls;

import java.util.Arrays;
import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;


public class CustomUserDetails implements UserDetails{
 
	private UserDtls user;

public CustomUserDetails(UserDtls user) {
		super();
		this.user = user;
	}

@Override
public Collection<? extends GrantedAuthority> getAuthorities() {
	SimpleGrantedAuthority simpleGrantedAuthority= new SimpleGrantedAuthority(user.getRole());
	
	return Arrays.asList(simpleGrantedAuthority);
}

@Override
public String getPassword() {
	// TODO Auto-generated method stub
	return user.getPassword();
}

@Override
public String getUsername() {
	// TODO Auto-generated method stub
	return user.getFullName()	;
}

@Override
public boolean isAccountNonExpired() {
	// TODO Auto-generated method stub
	return true;
}

@Override
public boolean isAccountNonLocked() {
	// TODO Auto-generated method stub
	return true;
}

@Override
public boolean isCredentialsNonExpired() {
	// TODO Auto-generated method stub
	return true;
}

@Override
public boolean isEnabled() {
	// TODO Auto-generated method stub
	return true;
}
}
//CustomUserDetails

package com.example.assignment.security.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfiguration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration

public class SecurityConfig  {
	
	@Bean
	public UserDetailsService getUserDetailsService() {;
	 return new UserDetailsServiceImp();
	}
	
	@Bean
	public BCryptPasswordEncoder  getPasswordEncoder() {
		return new BCryptPasswordEncoder();
	}
	@Bean
	public DaoAuthenticationProvider getDaoAuthProvider() {
		DaoAuthenticationProvider daoAuthenticationProvider= new DaoAuthenticationProvider();
		daoAuthenticationProvider.setUserDetailsService(getUserDetailsService());
		daoAuthenticationProvider.setPasswordEncoder(getPasswordEncoder());
		return daoAuthenticationProvider;
	}
	
	protected void configure(AuthenticationManagerBuilder auth) throws Exception{
		
		auth.authenticationProvider(getDaoAuthProvider());
	}

	
	@Bean
	public SecurityFilterChain filterChain(HttpSecurity  httpSecurity) throws Exception {
		httpSecurity.csrf().disable()
		.authorizeHttpRequests().requestMatchers("/admin/**").hasRole("ADMIN")
		.requestMatchers("/user/**").hasRole("USER")
		.requestMatchers("/**").permitAll().and().formLogin().loginPage("/signin")
		.loginProcessingUrl("/login").defaultSuccessUrl("/user/");
		return httpSecurity.build();
		
	}
}
//SecurityConfig


package com.example.assignment.security.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.example.assignment.model.UserDtls;
import com.example.assignment.repository.UserRepository;

@Service
public class UserDetailsServiceImp implements UserDetailsService{
	
	@Autowired
	private UserRepository userRepo;
    
	//checking user name is correct or not	
	@Override
	public UserDetails loadUserByUsername(String fullName) throws UsernameNotFoundException {
		UserDtls user= userRepo.findByFullName(fullName);
		if(user != null) {
			return new CustomUserDetails(user);
			
		}

		throw new UsernameNotFoundException("user not available");
		
	}

}
//UserDetailsServiceImplemantation

package com.example.assignment.service;

import com.example.assignment.model.UserDtls;

public interface UserService {
public UserDtls createUser(UserDtls user);
public boolean checkName(String fullName);
}
//UserService

package com.example.assignment.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.assignment.model.UserDtls;
import com.example.assignment.repository.UserRepository;

@Service
public class UserServiceImplementation implements UserService{
	
	@Autowired
	private UserRepository userRepo;
	
	@Autowired
	private BCryptPasswordEncoder passwordEncode;
	
	@Override
	public UserDtls createUser(UserDtls user) {
		user.setPassword(passwordEncode.encode(user.getPassword()));
		user.setRole("ROLE_USER");

		return userRepo.save(user);
	}
	

	@Override
	public boolean checkName(String fullName) {
		// TODO Auto-generated method stub
		return userRepo.existsByFullName(fullName);
	}


	
	

}
//UserServiceImplemention