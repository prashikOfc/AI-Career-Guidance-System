-- Guidance AI Database Schema

CREATE DATABASE IF NOT EXISTS `guidance_ai`;
USE `guidance_ai`;

-- Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) DEFAULT 'user',
  `age` INT NOT NULL,
  `degree` VARCHAR(100) NOT NULL,
  `gpa` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Career Assessments Table
CREATE TABLE IF NOT EXISTS `assessments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_email` VARCHAR(150) NOT NULL,
  `timestamp` VARCHAR(50) NOT NULL,
  `coding` INT NOT NULL,
  `design` INT NOT NULL,
  `writing` INT NOT NULL,
  `analysis` INT NOT NULL,
  `speaking` INT NOT NULL,
  `communication` INT DEFAULT 3,
  `aptitude` INT DEFAULT 3,
  `iq` INT DEFAULT 3,
  `interests` TEXT NOT NULL,
  `goals` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Assessment Matches Table
CREATE TABLE IF NOT EXISTS `assessment_matches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `assessment_id` INT NOT NULL,
  `career_name` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `match_percentage` INT NOT NULL,
  `median_salary` INT NOT NULL,
  `growth_rate` INT NOT NULL,
  `courses` TEXT NOT NULL,
  `missing_skills` TEXT NOT NULL,
  FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Saved Career Routes
CREATE TABLE IF NOT EXISTS `saved_careers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_email` VARCHAR(150) NOT NULL,
  `career_name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_career` (`user_email`, `career_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Resume ATS Scans
CREATE TABLE IF NOT EXISTS `resume_scans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_email` VARCHAR(150) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `score` INT NOT NULL,
  `parsed_skills` TEXT NOT NULL,
  `missing_skills` TEXT NOT NULL,
  `improvements` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chatbot Counselor History
CREATE TABLE IF NOT EXISTS `chat_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_email` VARCHAR(150) NOT NULL,
  `sender` VARCHAR(10) NOT NULL, -- 'user' or 'bot'
  `message` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
