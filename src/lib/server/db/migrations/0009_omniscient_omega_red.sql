-- Custom SQL migration file, put you code below! --
INSERT INTO `settings` (`library`)
SELECT `uuid` FROM `libraries`;