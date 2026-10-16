CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` enum('aviso','evento','comunicado','devocional') DEFAULT 'aviso',
	`imageUrl` text,
	`pinned` boolean DEFAULT false,
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cell_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`personId` int,
	`visitorName` varchar(255),
	`status` enum('presente','ausente','visitante') NOT NULL,
	`isNewSoul` boolean DEFAULT false,
	CONSTRAINT `cell_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cell_meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cellId` int NOT NULL,
	`churchId` int NOT NULL,
	`meetingDate` date NOT NULL,
	`topic` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cell_meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cell_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cellId` int NOT NULL,
	`personId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `cell_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cells` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`leaderId` int NOT NULL,
	`supervisorId` int,
	`hostId` int,
	`address` text,
	`city` varchar(100),
	`neighborhood` varchar(100),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`meetingDay` enum('segunda','terca','quarta','quinta','sexta','sabado','domingo'),
	`meetingTime` varchar(5),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cells_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `church_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`userId` int,
	`personId` int,
	`role` enum('pastor_presidente','pastor_local','supervisor','lider','consolidador','diacono','secretario','tesoureiro','membro') NOT NULL DEFAULT 'membro',
	`active` boolean NOT NULL DEFAULT true,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `church_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `churches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logoUrl` text,
	`primaryColor` varchar(7) DEFAULT '#1e3a5f',
	`secondaryColor` varchar(7) DEFAULT '#c9a84c',
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(9),
	`phone` varchar(20),
	`whatsapp` varchar(20),
	`email` varchar(320),
	`website` text,
	`socialMedia` json,
	`vision` text,
	`mission` text,
	`values` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `churches_id` PRIMARY KEY(`id`),
	CONSTRAINT `churches_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `consolidations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`soulId` int NOT NULL,
	`consolidatorId` int NOT NULL,
	`callMade` boolean DEFAULT false,
	`callDate` timestamp,
	`messageSent` boolean DEFAULT false,
	`messageDate` timestamp,
	`visitMade` boolean DEFAULT false,
	`visitDate` timestamp,
	`bibleDelivered` boolean DEFAULT false,
	`bibleDate` timestamp,
	`whatsappGroupAdded` boolean DEFAULT false,
	`whatsappDate` timestamp,
	`prayerMade` boolean DEFAULT false,
	`prayerDate` timestamp,
	`addedToCell` boolean DEFAULT false,
	`cellDate` timestamp,
	`notes` text,
	`status` enum('em_consolidacao','consolidado') NOT NULL DEFAULT 'em_consolidacao',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consolidations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counseling_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`personId` int NOT NULL,
	`counselorId` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`notes` text,
	`status` enum('agendado','realizado','cancelado') DEFAULT 'agendado',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `counseling_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`personId` int NOT NULL,
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`certificateUrl` text,
	`status` enum('matriculado','em_andamento','concluido') DEFAULT 'matriculado',
	CONSTRAINT `course_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('salvacao','oracao','biblia','igreja','espirito_santo','batismo','outro') NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`personId` int NOT NULL,
	`registeredAt` timestamp NOT NULL DEFAULT (now()),
	`checkedIn` boolean DEFAULT false,
	`checkedInAt` timestamp,
	`status` enum('inscrito','participou','cancelado') DEFAULT 'inscrito',
	CONSTRAINT `event_registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('congresso','conferencia','vigilia','retiro','seminario','culto','outro') NOT NULL,
	`description` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`location` text,
	`maxCapacity` int,
	`qrCode` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`familyName` varchar(255) NOT NULL,
	`fatherId` int,
	`motherId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `families_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int NOT NULL,
	`personId` int NOT NULL,
	`relation` enum('pai','mae','filho','filha','outro') NOT NULL,
	CONSTRAINT `family_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `library_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('pdf','video','apostila','devocional') NOT NULL,
	`fileUrl` text,
	`thumbnailUrl` text,
	`description` text,
	`requiredRole` enum('pastor_presidente','pastor_local','supervisor','lider','consolidador','diacono','secretario','tesoureiro','membro') DEFAULT 'membro',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `library_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ministries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('louvor','infantil','recepcao','midia','intercessao','evangelismo','casais','jovens','outro') NOT NULL,
	`leaderId` int,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ministries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ministry_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ministryId` int NOT NULL,
	`personId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `ministry_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`photoUrl` text,
	`fullName` varchar(255) NOT NULL,
	`cpf` varchar(14),
	`rg` varchar(20),
	`birthDate` date,
	`gender` enum('masculino','feminino','outro'),
	`maritalStatus` enum('solteiro','casado','divorciado','viuvo','uniao_estavel'),
	`profession` varchar(100),
	`education` varchar(100),
	`phone` varchar(20),
	`whatsapp` varchar(20),
	`email` varchar(320),
	`zipCode` varchar(9),
	`street` varchar(255),
	`number` varchar(10),
	`neighborhood` varchar(100),
	`city` varchar(100),
	`state` varchar(2),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`conversionDate` date,
	`baptismDate` date,
	`previousChurch` varchar(255),
	`pastoralNotes` text,
	`discipleshipStage` enum('nova_alma','consolidacao','fundamentos','celula','batismo','encontro_com_deus','escola_de_lideres','lideranca','multiplicador') DEFAULT 'nova_alma',
	`wonById` int,
	`discipledById` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `people_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prayer_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`personId` int,
	`visitorName` varchar(255),
	`visitorPhone` varchar(20),
	`type` enum('pedido','testemunho') NOT NULL DEFAULT 'pedido',
	`content` text NOT NULL,
	`isPrivate` boolean DEFAULT false,
	`answered` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prayer_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`ministryId` int NOT NULL,
	`personId` int NOT NULL,
	`scheduledDate` date NOT NULL,
	`role` varchar(100),
	`notified` boolean DEFAULT false,
	`confirmed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `souls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`personId` int,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`address` text,
	`decisionDate` date NOT NULL,
	`origin` enum('culto','evangelismo','celula','evento','redes_sociais','indicacao') NOT NULL,
	`acceptedJesus` boolean DEFAULT false,
	`reconciliation` boolean DEFAULT false,
	`firstVisit` boolean DEFAULT false,
	`wonById` int NOT NULL,
	`notes` text,
	`status` enum('nova_alma','em_consolidacao','consolidado') NOT NULL DEFAULT 'nova_alma',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `souls_id` PRIMARY KEY(`id`)
);
