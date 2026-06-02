-- Database: `tms_db`

CREATE DATABASE IF NOT EXISTS `tms_db`;
USE `tms_db`;

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(100) DEFAULT 'Laboratory Manager',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `username`, `password`, `role`) VALUES
(1, 'admin', 'admin123', 'Laboratory Manager');

-- --------------------------------------------------------

--
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_name` varchar(255) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `dob` date NOT NULL,
  `registration_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `patients`
--

INSERT INTO `patients` (`id`, `patient_name`, `contact_number`, `email_address`, `dob`, `registration_date`) VALUES
(1, 'Michael Chen', '+1 234 567 8900', 'michael@example.com', '1985-06-15', '2026-05-18 04:30:00'),
(2, 'Sarah Jenkins', '+1 987 654 3210', 'sarah.j@example.com', '1992-11-23', '2026-05-18 05:15:00'),
(3, 'Robert Fox', '+1 555 123 4567', 'rfox@example.com', '1978-03-10', '2026-05-17 09:45:00'),
(4, 'Emily Davis', '+1 444 888 9999', 'emily.d@example.com', '2000-12-05', '2026-05-17 14:20:00');

-- --------------------------------------------------------

--
-- Table structure for table `tests`
--

CREATE TABLE `tests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `test_id_string` varchar(50) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `test_type` varchar(100) NOT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `result_summary` text DEFAULT NULL,
  `test_date` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `test_id_string` (`test_id_string`),
  KEY `patient_id` (`patient_id`),
  CONSTRAINT `fk_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `tests`
--

INSERT INTO `tests` (`id`, `test_id_string`, `patient_id`, `test_type`, `notes`, `status`, `result_summary`, `test_date`) VALUES
(1, 'TST-001', 1, 'General Blood Panel', 'Fasting for 12 hours.', 'Completed', 'Normal parameters.', '2026-05-18'),
(2, 'TST-002', 2, 'Lipid Profile', 'Patient reported feeling dizzy.', 'Pending', NULL, '2026-05-18'),
(3, 'TST-003', 3, 'Thyroid Test', 'Regular checkup.', 'Completed', 'TSH levels elevated.', '2026-05-17'),
(4, 'TST-004', 4, 'Urinalysis', NULL, 'Pending', NULL, '2026-05-17');

COMMIT;
