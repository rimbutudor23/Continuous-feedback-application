# Continuous Feedback App

## Tehnologii Folosite

- **Frontend (SPA):** **React.js**
- **Backend (API):** **Node.js** cu **Express.js**
- **Bază de Date:** **PostgreSQL**
- **ORM:** **Sequelize**
- **Comunicare Live:** **WebSockets**
- **Versionare:** **Git**

---

## Funcționalități Cheie

### Profesor

- **Autentificare & Profil**
- **Definire Activitate**
- **Gestionare Coduri de Acces**
- **Dashboard & Status**
- **Feedback Continuu (LIVE)**
- **Detalii Feedback** (Acces la datele istorice de feedback (cronologie, grafice) pentru activitățile încheiate)

### Student

- **Accesare Rapidă**
- **Interfață Feedback**
- **Anonimitate**

---

## Modelul de Date

- **`profil`**
  - **profil_id** _(PK)_
  - **nume_utilizator**
  - **tip**
  - **email**
  - **parola**
- **`cod`**
  - **cod_id** _(PK)_
  - **continut**
  - **profesor_id** _(FK)_
  - **este_aleatoriu**
- **`activitate`**
  - **activitate_id** _(PK)_
  - **profesor_id** _(FK)_
  - **cod_id** _(FK)_
  - **titlu**
  - **descriere**
  - **ora_inceput**
  - **ora_sfarsit**
  - **accesibil_de_la**
  - **accesibil_pana_la**
- **`feedback`**
  - **feedback_id**
  - **activitate_id**
  - **creata_la**
  - **emoticon**

---

## Structura Folderelor

Proiectul este împărțit în două directoare principale pentru a separa logica de backend (API, DB) de aplicația client (SPA).