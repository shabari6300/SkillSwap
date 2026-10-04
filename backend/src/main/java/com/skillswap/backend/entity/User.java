package com.skillswap.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;
    private String password;
    private String teachSkill;
    private String learnSkill;

    private String bio;
    private String experienceLevel;
    private String teachDescription;
    private String learnDescription;

    public User() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getTeachSkill() {
        return teachSkill;
    }

    public void setTeachSkill(String teachSkill) {
        this.teachSkill = teachSkill;
    }

    public String getLearnSkill() {
        return learnSkill;
    }

    public void setLearnSkill(String learnSkill) {
        this.learnSkill = learnSkill;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getExperienceLevel() {
        return experienceLevel;
    }

    public void setExperienceLevel(String experienceLevel) {
        this.experienceLevel = experienceLevel;
    }

    public String getTeachDescription() {
        return teachDescription;
    }

    public void setTeachDescription(String teachDescription) {
        this.teachDescription = teachDescription;
    }

    public String getLearnDescription() {
        return learnDescription;
    }

    public void setLearnDescription(String learnDescription) {
        this.learnDescription = learnDescription;
    }
}