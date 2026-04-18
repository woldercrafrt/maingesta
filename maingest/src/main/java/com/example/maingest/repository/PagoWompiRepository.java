package com.example.maingest.repository;

import com.example.maingest.domain.PagoWompi;
import com.example.maingest.domain.Empresa;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;

public interface PagoWompiRepository extends JpaRepository<PagoWompi, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PagoWompi> findByReference(String reference);

    Optional<PagoWompi> findByWompiTransactionId(String wompiTransactionId);

    List<PagoWompi> findByEmpresa(Empresa empresa);
}
