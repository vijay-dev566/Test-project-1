package com.codewithme.www.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.codewithme.www.entity.NameEntity;
import com.codewithme.www.repository.NameRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
public class NameService {

	@Autowired
	NameRepository nameRepository;

	@PersistenceContext
	private EntityManager entityManager;

	private void resetAutoIncrementCounter() {
		try {
			entityManager.createNativeQuery("ALTER TABLE name_entity AUTO_INCREMENT = 1").executeUpdate();
		} catch (Exception e1) {
			try {
				entityManager.createNativeQuery("ALTER TABLE NameEntity AUTO_INCREMENT = 1").executeUpdate();
			} catch (Exception ignored) {}
		}
		try {
			entityManager.createNativeQuery("UPDATE name_entity_seq SET next_val = 1").executeUpdate();
		} catch (Exception ignored) {}
	}

	// Add names
	@Transactional
	public String addName(NameEntity nameEnter) {
		if (nameRepository.count() == 0) {
			resetAutoIncrementCounter();
		}
		nameEnter.setId(0);
		nameRepository.save(nameEnter);
		return "details saved";
	}

	// Get All Names (sorted by ID)
	public List<NameEntity> getAllNames() {
		List<NameEntity> list = nameRepository.findAll();
		list.sort(Comparator.comparingInt(NameEntity::getId));
		return list;
	}

	// Get by ID
	public ResponseEntity<NameEntity> getNameById(int id) {
		return new ResponseEntity<>(nameRepository.findById(id).orElse(null), HttpStatus.OK);
	}

	// Delete by ID and re-sequence remaining records
	@Transactional
	public String deleteById(int id) {
		nameRepository.deleteById(id);
		resequenceInternal();
		return "name deleted and sequence updated";
	}

	// Update name
	public String updateName(NameEntity nameEnter) {
		nameRepository.save(nameEnter);
		return "name updated";
	}

	// Delete all and reset auto-increment to 1
	@Transactional
	public String deleteAll() {
		try {
			entityManager.createNativeQuery("TRUNCATE TABLE name_entity").executeUpdate();
		} catch (Exception e) {
			nameRepository.deleteAll();
			nameRepository.flush();
			resetAutoIncrementCounter();
		}
		try {
			entityManager.createNativeQuery("UPDATE name_entity_seq SET next_val = 1").executeUpdate();
		} catch (Exception ignored) {}
		return "all names deleted";
	}

	// Resequence all existing records into clean 1, 2, 3...
	@Transactional
	public synchronized void resequenceInternal() {
		List<NameEntity> list = nameRepository.findAll();
		if (list.isEmpty()) {
			resetAutoIncrementCounter();
			return;
		}

		list.sort(Comparator.comparingInt(NameEntity::getId));
		List<String> names = new ArrayList<>();
		for (NameEntity entity : list) {
			names.add(entity.getName());
		}

		nameRepository.deleteAll();
		nameRepository.flush();

		resetAutoIncrementCounter();

		for (String name : names) {
			NameEntity entity = new NameEntity();
			entity.setName(name);
			nameRepository.save(entity);
		}
		nameRepository.flush();
	}

}
