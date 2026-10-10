import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://hireai-backend-f3oy.onrender.com/api";
const AI_URL = "http://127.0.0.1:8001/api";

function App() {
const [activeTab, setActiveTab] = useState("dashboard");
const [showJobForm, setShowJobForm] = useState(false);

const [jobForm, setJobForm] = useState({
title: "",
company: "",
location: "",
description: "",
requiredSkills: "",
experienceLevel: "Fresher",
});

const [jobMessage, setJobMessage] = useState("");

const [form, setForm] = useState({
name: "",
email: "",
phone: "",
education: "",
experience: "",
});

const [message, setMessage] = useState("");
const [jobs, setJobs] = useState([]);
const [jobsLoading, setJobsLoading] = useState(false);
const [jobsError, setJobsError] = useState("");

// Resume analysis state
const [resumeFile, setResumeFile] = useState(null);
const [resumeLoading, setResumeLoading] = useState(false);
const [resumeError, setResumeError] = useState("");
const [resumeResult, setResumeResult] = useState(null);
const [recommendations, setRecommendations] = useState([]);
const [matchLoading, setMatchLoading] = useState(false);

useEffect(() => {
if (activeTab !== "jobs") return;


const fetchJobs = async () => {
  setJobsLoading(true);
  setJobsError("");

  try {
    const response = await fetch(`${API_URL}/jobs`);

    if (!response.ok) {
      throw new Error("Could not load jobs.");
    }

    const data = await response.json();
    setJobs(data);
  } catch {
    setJobsError(
      "Unable to load jobs. Please check that the backend is running."
    );
  } finally {
    setJobsLoading(false);
  }
};

fetchJobs();


}, [activeTab]);

const handleChange = (event) => {
setForm({
...form,
[event.target.name]: event.target.value,
});
};

const handleJobChange = (event) => {
setJobForm({
...jobForm,
[event.target.name]: event.target.value,
});
};

const handleJobSubmit = async (event) => {
event.preventDefault();
setJobMessage("");


try {
  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(jobForm),
  });

  if (!response.ok) {
    throw new Error("Could not save the job.");
  }

  const savedJob = await response.json();
  setJobs((previousJobs) => [...previousJobs, savedJob]);
  setJobMessage("Job posted successfully!");

  setJobForm({
    title: "",
    company: "",
    location: "",
    description: "",
    requiredSkills: "",
    experienceLevel: "Fresher",
  });

  setShowJobForm(false);
} catch {
  setJobMessage(
    "Could not post the job. Please check that the backend is running."
  );
}


};

const handleRegister = async (event) => {
event.preventDefault();
setMessage("");


try {
  const response = await fetch(`${API_URL}/candidates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    throw new Error("Registration failed.");
  }

  const candidate = await response.json();

  setMessage(
    `Registration successful! Candidate ID: ${candidate.id}`
  );

  setForm({
    name: "",
    email: "",
    phone: "",
    education: "",
    experience: "",
  });
} catch {
  setMessage(
    "Registration failed. Please check that the backend is running."
  );
}


};

// Upload the selected PDF to the Python AI service
const handleResumeAnalysis = async (event) => {
event.preventDefault();


if (!resumeFile) {
  setResumeError("Please select a PDF resume first.");
  return;
}

setResumeLoading(true);
setResumeError("");
setResumeResult(null);
setRecommendations([]);

try {
  const uploadData = new FormData();
  uploadData.append("file", resumeFile);

  const response = await fetch(`${AI_URL}/resume/extract`, {
    method: "POST",
    body: uploadData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Resume analysis failed.");
  }

  setResumeResult(data);

  // Request job recommendations using extracted skills
  if (data.detectedSkills.length > 0) {
    setMatchLoading(true);

    try {
      const skills = data.detectedSkills.join(",");
      const matchResponse = await fetch(
        `${AI_URL}/jobs/match?skills=${encodeURIComponent(skills)}`
      );

      const matchData = await matchResponse.json();

      if (!matchResponse.ok) {
        throw new Error(
          matchData.detail || "Could not calculate job matches."
        );
      }

      setRecommendations(matchData.recommendations || []);
    } catch (error) {
      setResumeError(
        `Resume extracted successfully, but job matching failed: ${error.message}`
      );
    } finally {
      setMatchLoading(false);
    }
  }
} catch (error) {
  setResumeError(error.message || "Could not analyze the resume.");
} finally {
  setResumeLoading(false);
}


};

return ( <div className="app"> <aside className="sidebar"> <h2>HireAI</h2> <p className="tagline">Smart Career Platform</p>


    <button onClick={() => setActiveTab("dashboard")}>
      Dashboard
    </button>

    <button onClick={() => setActiveTab("register")}>
      Candidate Registration
    </button>

    <button onClick={() => setActiveTab("jobs")}>
      Job Opportunities
    </button>

    <button onClick={() => setActiveTab("recruiter")}>
      Recruiter Job Posting
    </button>

    <button onClick={() => setActiveTab("resume")}>
      Resume Analysis
    </button>
  </aside>

  <main className="main">
    <header className="topbar">
      <span>AI-Based Resume Screening System</span>
      <span>Candidate Portal</span>
    </header>

    {activeTab === "dashboard" && (
      <section>
        <h1>Welcome to HireAI</h1>
        <p className="subtitle">
          Your smart platform for discovering career opportunities.
        </p>

        <div className="dashboard-cards">
          <div className="card">
            <h3>Candidate Registration</h3>
            <p>Create your candidate profile.</p>
            <button onClick={() => setActiveTab("register")}>
              Register Now
            </button>
          </div>

          <div className="card">
            <h3>Job Opportunities</h3>
            <p>Explore available jobs and required skills.</p>
            <button onClick={() => setActiveTab("jobs")}>
              View Jobs
            </button>
          </div>

          <div className="card">
            <h3>AI Resume Analysis</h3>
            <p>Extract resume skills and find matching jobs.</p>
            <button onClick={() => setActiveTab("resume")}>
              Analyze Resume
            </button>
          </div>
        </div>
      </section>
    )}

    {activeTab === "register" && (
      <section>
        <h1>Candidate Registration</h1>
        <p className="subtitle">
          Enter your details to create your candidate profile.
        </p>

        <form className="candidate-form" onSubmit={handleRegister}>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />

          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
            required
          />

          <label htmlFor="education">Education</label>
          <input
            id="education"
            name="education"
            value={form.education}
            onChange={handleChange}
            placeholder="e.g. B.Tech AIML"
            required
          />

          <label htmlFor="experience">Experience</label>
          <input
            id="experience"
            name="experience"
            value={form.experience}
            onChange={handleChange}
            placeholder="e.g. Fresher"
            required
          />

          <button type="submit">Register Candidate</button>

          {message && <p role="status">{message}</p>}
        </form>
      </section>
    )}

    {activeTab === "jobs" && (
      <section>
        <h1>Job Opportunities</h1>
        <p className="subtitle">
          Explore jobs that match your skills and career goals.
        </p>

        {jobsLoading && <p>Loading jobs...</p>}
        {jobsError && <p role="alert">{jobsError}</p>}

        {!jobsLoading && !jobsError && jobs.length === 0 && (
          <p>No jobs are available yet.</p>
        )}

        <div className="job-list">
          {jobs.map((job) => (
            <div className="job-card" key={job.id}>
              <h2>{job.title}</h2>
              <p><strong>Company:</strong> {job.company}</p>
              <p><strong>Location:</strong> {job.location}</p>
              <p><strong>Experience:</strong> {job.experienceLevel}</p>
              <p><strong>Description:</strong> {job.description}</p>
              <p><strong>Required Skills:</strong> {job.requiredSkills}</p>
            </div>
          ))}
        </div>
      </section>
    )}

    {activeTab === "recruiter" && (
      <section>
        <h1>Recruiter Job Posting</h1>
        <p className="subtitle">
          Publish a job opening for candidates.
        </p>

        <form className="candidate-form" onSubmit={handleJobSubmit}>
          <label htmlFor="job-title">Job Title</label>
          <input
            id="job-title"
            name="title"
            value={jobForm.title}
            onChange={handleJobChange}
            placeholder="e.g. Junior AI Engineer"
            required
          />

          <label htmlFor="job-company">Company</label>
          <input
            id="job-company"
            name="company"
            value={jobForm.company}
            onChange={handleJobChange}
            placeholder="Enter company name"
            required
          />

          <label htmlFor="job-location">Location</label>
          <input
            id="job-location"
            name="location"
            value={jobForm.location}
            onChange={handleJobChange}
            placeholder="e.g. Hyderabad"
            required
          />

          <label htmlFor="job-description">Job Description</label>
          <textarea
            id="job-description"
            name="description"
            value={jobForm.description}
            onChange={handleJobChange}
            placeholder="Describe the role"
            required
          />

          <label htmlFor="job-skills">Required Skills</label>
          <input
            id="job-skills"
            name="requiredSkills"
            value={jobForm.requiredSkills}
            onChange={handleJobChange}
            placeholder="Python, Java, SQL"
            required
          />

          <label htmlFor="job-experience">Experience Level</label>
          <select
            id="job-experience"
            name="experienceLevel"
            value={jobForm.experienceLevel}
            onChange={handleJobChange}
          >
            <option value="Fresher">Fresher</option>
            <option value="0-2 years">0–2 years</option>
            <option value="2-5 years">2–5 years</option>
            <option value="5+ years">5+ years</option>
          </select>

          <button type="submit">Post Job</button>
          {jobMessage && <p role="status">{jobMessage}</p>}
        </form>
      </section>
    )}

    {activeTab === "resume" && (
      <section>
        <h1>AI Resume Analysis</h1>
        <p className="subtitle">
          Upload your resume to extract skills, discover suitable jobs,
          and identify skills you may need to learn.
        </p>

        <form
          className="candidate-form"
          onSubmit={handleResumeAnalysis}
        >
          <label htmlFor="resume-file">Upload Resume (PDF)</label>
          <input
            id="resume-file"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => {
              setResumeFile(event.target.files?.[0] || null);
              setResumeError("");
              setResumeResult(null);
              setRecommendations([]);
            }}
            required
          />

          {resumeFile && (
            <p>Selected file: {resumeFile.name}</p>
          )}

          <button type="submit" disabled={resumeLoading}>
            {resumeLoading ? "Analyzing Resume..." : "Analyze My Resume"}
          </button>

          {resumeError && <p role="alert">{resumeError}</p>}
        </form>

        {resumeResult && (
          <div className="job-card">
            <h2>Resume Analysis Results</h2>
            <p><strong>File:</strong> {resumeResult.filename}</p>
            <p><strong>Pages:</strong> {resumeResult.pages}</p>
            <p><strong>Skills Found:</strong> {resumeResult.skillCount}</p>

            <h3>Extracted Skills</h3>
            {resumeResult.detectedSkills.length > 0 ? (
              <div className="skill-list">
                {resumeResult.detectedSkills.map((skill) => (
                  <span className="skill-tag" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p>
                No recognized skills were found. Try a text-based PDF
                resume that clearly lists your skills.
              </p>
            )}

            <h3>Extracted Resume Text</h3>
            <details>
              <summary>View extracted text</summary>
              <pre className="resume-text">
                {resumeResult.extractedText}
              </pre>
            </details>
          </div>
        )}

        {resumeResult && resumeResult.detectedSkills.length > 0 && (
          <div className="job-list">
            <h2>Recommended Jobs &amp; Skill Gap Analysis</h2>

            {matchLoading && <p>Finding matching jobs...</p>}

            {!matchLoading && recommendations.length === 0 && (
              <p>No matching job recommendations were returned.</p>
            )}

            {recommendations.map((job) => (
              <div className="job-card" key={job.jobId}>
                <h2>{job.title}</h2>
                <p><strong>Company:</strong> {job.company}</p>
                <p><strong>Location:</strong> {job.location}</p>

                <h3>Job Match: {job.matchPercentage}%</h3>
                <div
                  className="match-track"
                  role="progressbar"
                  aria-label={`Match for ${job.title}`}
                  aria-valuenow={job.matchPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="match-fill"
                    style={{ width: `${job.matchPercentage}%` }}
                  />
                </div>

                <p>
                  <strong>Matched Skills:</strong>{" "}
                  {job.matchedSkills.length
                    ? job.matchedSkills.join(", ")
                    : "None"}
                </p>

                <p>
                  <strong>Skills to Learn:</strong>{" "}
                  {job.missingSkills.length
                    ? job.missingSkills.join(", ")
                    : "No missing required skills detected"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    )}
  </main>
</div>


);
}

export default App;
