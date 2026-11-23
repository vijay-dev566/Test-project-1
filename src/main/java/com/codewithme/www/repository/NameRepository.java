package com.codewithme.www.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.codewithme.www.entity.NameEntity;

public interface NameRepository extends
		JpaRepository<NameEntity, Integer>{

}
