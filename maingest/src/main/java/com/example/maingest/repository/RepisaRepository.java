package com.example.maingest.repository;

import com.example.maingest.domain.Armario;
import com.example.maingest.domain.Repisa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepisaRepository extends JpaRepository<Repisa, Long> {

    List<Repisa> findByArmario(Armario armario);
}

