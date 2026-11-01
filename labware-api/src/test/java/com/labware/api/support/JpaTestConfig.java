package com.labware.api.support;

import com.labware.api.model.entity.*;
import com.labware.api.repository.*;
import com.labware.api.service.*;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import javax.sql.DataSource;
import java.util.Map;

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(basePackageClasses = UsuarioRepository.class,
        includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {UsuarioRepository.class, EmailPendenteRepository.class}),
        excludeFilters = @ComponentScan.Filter(type = FilterType.REGEX,
                pattern = "com[.]labware[.]api[.]repository[.](?!UsuarioRepository$|EmailPendenteRepository$).*"))
public class JpaTestConfig {
    @Bean DataSource dataSource() {
        return new DriverManagerDataSource("jdbc:h2:mem:labware-tests;DB_CLOSE_DELAY=-1;INIT=CREATE DOMAIN IF NOT EXISTS JSONB AS JSON", "sa", "");
    }

    @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        var factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setManagedTypes(PersistenceManagedTypes.of(Usuario.class.getName(), Empresa.class.getName(), EmailPendente.class.getName()));
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop", "hibernate.generate_statistics", "true"));
        return factory;
    }

    @Bean PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
        return new JpaTransactionManager(factory);
    }

    @Bean EmailService emailService(EmailPendenteRepository emails) { return new EmailService(emails); }
}
