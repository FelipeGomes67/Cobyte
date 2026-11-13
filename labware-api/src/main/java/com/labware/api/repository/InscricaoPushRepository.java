package com.labware.api.repository;
import com.labware.api.model.entity.InscricaoPush;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface InscricaoPushRepository extends JpaRepository<InscricaoPush,String> {
 List<InscricaoPush> findByUsuarioId(Long usuarioId);
}
