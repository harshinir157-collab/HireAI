package com.harshini.resume_job_portal.repository;

import com.harshini.resume_job_portal.entity.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateRepository extends JpaRepository<Candidate, Long> {
}