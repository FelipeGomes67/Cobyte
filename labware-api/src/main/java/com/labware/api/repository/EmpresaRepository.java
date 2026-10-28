package com.labware.api.repository;

import com.labware.api.model.entity.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {
    java.util.List<Empresa> findByAtivaTrueOrderByNomeAsc();
    Optional<Empresa> findByCnpj(String cnpj);
}