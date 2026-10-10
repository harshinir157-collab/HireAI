
package com.harshini.resume_job_portal.repository;

import com.harshini.resume_job_portal.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobRepository extends JpaRepository<Job, Long> {
}