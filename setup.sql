CREATE DATABASE WardrobeApp;
USE WardrobeApp;

CREATE TABLE Accounts (
    userId int NOT NULL AUTO_INCREMENT,
    firstName varchar(32),
    lastName varchar(32),
    email varchar(64),
    password varchar(64),
    dob varchar(32),
    PRIMARY KEY (userId)
);

CREATE USER 'wardrobe_app_main'@'localhost' IDENTIFIED BY 'seniord';
GRANT ALL PRIVILEGES ON * . * TO 'wardrobe_app_main'@'localhost';
FLUSH PRIVILEGES;

