package com.codewithme.www.nameController;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.codewithme.www.entity.NameEntity;
import com.codewithme.www.service.NameService;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/name")
public class NameController {
	@Autowired
	NameService nameService;
	
	//Add names
	@PostMapping("/add")
	public String addName(@RequestBody NameEntity nameEnter) {
		return nameService.addName(nameEnter);
	}
	
	//Get All Names
	@GetMapping("/getAllNames")
	public List<NameEntity> getAllNames(){
		return nameService.getAllNames();
	}
	
	//Get By Id
	@GetMapping("getById/{id}")
	public ResponseEntity<NameEntity> getNameById(@PathVariable int id) {
		return nameService.getNameById(id);
	}
	
	@DeleteMapping("delete/{id}")
	public String deleteById(@PathVariable int id) {
		return nameService.deleteById(id);
	}

	//Update name
	@PutMapping("/update")
	public String updateName(@RequestBody NameEntity nameEnter) {
		return nameService.updateName(nameEnter);
	}

	//Delete all names
	@DeleteMapping("/deleteAll")
	public String deleteAll() {
		return nameService.deleteAll();
	}

	//Resequence all records
	@PostMapping("/resequence")
	public String resequence() {
		nameService.resequenceInternal();
		return "records re-sequenced successfully";
	}

	@GetMapping("/resequence")
	public String resequenceGet() {
		nameService.resequenceInternal();
		return "records re-sequenced successfully";
	}

}
