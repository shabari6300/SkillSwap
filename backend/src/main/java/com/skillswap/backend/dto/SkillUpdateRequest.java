package com.skillswap.backend.dto;

public class SkillUpdateRequest {

    private String email;
    private String teachSkill;
    private String learnSkill;

    public SkillUpdateRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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
}
