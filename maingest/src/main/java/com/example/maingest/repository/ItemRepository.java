package com.example.maingest.repository;

import com.example.maingest.domain.Item;
import com.example.maingest.domain.Repisa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findByRepisa(Repisa repisa);
}

