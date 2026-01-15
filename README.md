# Continuous Feedback App

🔗 **Link aplicație:**  
https://tud-dar-tw.vercel.app

---

## Conturi de Test

### 👨‍🏫 Cont Profesor
- **Email:** tudorica@gmail.com  
- **Username:** tudorica  
- **Parolă:** tudorica  

### 👩‍🎓 Cont Student
- **Email:** dariuta@gmail.com  
- **Username:** dariuta  
- **Parolă:** dariuta  

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
  - **nume_utilizator** _(unic)_
  - **tip** _(ENUM: profesor, student)_
  - **email** _(unic)_
  - **parola**
  - **created_at**
  - **updated_at**
- **`cod`**
  - **cod_id** _(PK)_
  - **continut**
  - **profesor_id** _(FK → profil.profil_id)_
  - **este_aleatoriu**
  - **created_at**
  - **updated_at**
- **`activitate`**
  - **activitate_id** _(PK)_
  - **profesor_id** _(FK → profil.profil_id)_
  - **cod_id** _(FK → cod.cod_id)_
  - **titlu**
  - **descriere**
  - **ora_inceput**
  - **ora_sfarsit**
  - **accesibil_de_la**
  - **accesibil_pana_la**
  - **created_at**
  - **updated_at**
- **`feedback`**
  - **feedback_id** _(PK)_
  - **activitate_id** _(FK → activitate.activitate_id)_
  - **emoticon**
  - **created_at**
- **`participare`**
  - **participare_id** _(PK)_
  - **student_id** _(FK → profil.profil_id)_
  - **activitate_id** _(FK → activitate.activitate_id)_
  - **joined_at**
  - **last_action_at**
  - **created_at**
  - **updated_at**

---

## Structura Folderelor

Proiectul este împărțit în două directoare principale pentru a separa logica de backend (API, DB) de aplicația client (SPA).
