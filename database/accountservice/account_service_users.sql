-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: account_service
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` int DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,NULL,'car@gmail.com','$2a$10$mgAWaQvElxEp.cvJuyBPeOmJhQAXnjwYxTaQkMZH1udUH1pud.8Ti','Hưng lọ vương','012345672',1,'2004-01-02',1,'2026-01-15 16:19:30','2026-01-17 18:33:08'),(2,'http://localhost:8081/uploads/avatar_27145ab6-fedc-4589-a9d0-0e2b2f9598c2_IMG_1434.JPG','a@gmail.com','$2a$10$j.MRIXyJu1Izfw0z3JGaqOY91KN5h8OQoYqNn2/WI2e6qBoBvdZ3S','Duy','0982389741',NULL,NULL,1,'2026-01-16 06:58:45','2026-03-06 08:02:03'),(3,NULL,'b@gmail.com','$2a$10$459TGWw7KuD5tRH9Pzl7kukNyOWdXDbtUOQGtufWxa6zdt..Lx4ye','Duy','123456789',NULL,NULL,1,'2026-01-16 07:02:11','2026-01-16 07:02:11'),(4,NULL,'ec@gmail.com','$2a$10$U1mhR807ntGCTdrz06TRZuFD9FE2B8yCFqIYo3CsIPXsEcGsHdncW','nguyễc','124235234',NULL,NULL,1,'2026-01-17 18:43:06','2026-01-17 18:43:06'),(5,NULL,'d@gmail.com','$2a$10$7bm6Z0t9WdjqP/mBOP.CDe9pL/Kl.ZNJVwQxINPVRPJ/Wa5ieNLw.','Duy','123456789',NULL,NULL,1,'2026-01-17 18:47:57','2026-01-17 18:47:57'),(6,'http://localhost:8081/uploads/avatar_63438e74-8bc7-4a71-ae38-e454cf261944_IMG_1445.JPG','hh@gmail.com','$2a$10$5nkxvOJ5AR0.hP4LquDnk.c2YvxxI7G9FOv8pk/T5FdJBHdcv1W/W','Tú đầu đất','41252342',1,'2026-03-06',1,'2026-01-17 19:02:01','2026-03-06 07:58:13'),(7,'http://localhost:8081/uploads/avatar_9e80888b-ced5-44dd-b76c-518acdfe94ac_IMG_1433.JPG','lo@gmail.com','$2a$10$Tjvk1R7Zes4f.HEbhwIB7ujfJ3vKH9kRtiQt08DEL70ON49c6biBe','Lọ Thánh Cảnh','092361238',1,'2004-10-29',1,'2026-01-19 13:41:36','2026-03-06 07:56:57');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-27 20:33:49
