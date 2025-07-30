import React, { useState, useEffect } from "react";
import './App.css';

const Guestbook = () => {
  const [formData, setFormData] = useState({
    Name: "",
    SurName: "",
    Mail: "",
    Note: "",
  });

  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    fetch("https://localhost:7149/api/user/users")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const formattedNotes = data.flatMap(user =>
          user.notes.map(note => ({
            id: note.userId,             // unique id olarak userId kullandık
            username: user.name,
            surname: user.surName,
            mail: user.mail,
            note: note.text,
            dateTime: user.dateTime
          }))
        );
        setNotes(formattedNotes);
      })
      .catch((err) => console.error("Error fetching notes:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newUser = {
      name: formData.Name,
      surName: formData.SurName,
      mail: formData.Mail,
      notes: [
        {
          text: formData.Note
        }
      ]
    };

    fetch("https://localhost:7149/api/user/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((savedUser) => {
       
        const newNotes = savedUser.notes.map(note => ({
          id: note.userId,
          username: savedUser.name,
          surname: savedUser.surName,
          mail: savedUser.mail,
          note: note.text,
          dateTime: savedUser.dateTime
        }));

        setNotes((prev) => [...prev, ...newNotes]);

        setFormData({
          Name: "",
          SurName: "",
          Mail: "",
          Note: "",
        });
      })
      .catch((err) => console.error("Error adding note:", err));
  };

  return (
    <>
      <style>
        {`
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          form {
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            margin: auto;
          }
          h2 {
            color: #333;
          }
          label {
            display: block;
            margin-bottom: 5px;
          }
          input[type="text"],
          input[type="email"],
          textarea {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
            border: 1px solid #ccc;
            box-sizing: border-box;
          }
          .form-actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
          }
          input[type="submit"], .toggle-notes-btn {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
          }
          input[type="submit"]:hover, .toggle-notes-btn:hover {
            background-color: #218838;
          }
          .notes {
            max-width: 500px;
            margin: 20px auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .note-item {
            border-bottom: 1px solid #ddd;
            padding: 10px 0;
          }
          .note-item:last-child {
            border-bottom: none;
          }
          .note-header { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
          }
          .note-author {
            font-weight: bold;
            color: #555;
          }
          .note-date { 
            font-size: 0.8em;
            color: #888;
          }
          .note-content {
            margin-left: 10px;
          }
        `}
      </style>

      <form onSubmit={handleSubmit}>
        <h2>Guestbook</h2>
        <div>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            name="Name"
            id="name"
            required
            value={formData.Name}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="surname">Surname</label>
          <input
            type="text"
            name="SurName"
            id="surname"
            required
            value={formData.SurName}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="mail">Mail</label>
          <input
            type="email"
            name="Mail"
            id="mail"
            required
            value={formData.Mail}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="note">Note</label>
          <textarea
            name="Note"
            id="note"
            rows="5"
            placeholder="Take notes here."
            value={formData.Note}
            onChange={handleChange}
          />
        </div>

        <div className="form-actions">
          <input type="submit" value="Submit" />
          <button
            type="button"
            className="toggle-notes-btn"
            onClick={() => setShowNotes(!showNotes)}
            disabled={notes.length === 0}
          >
            {showNotes ? "Hide Notes" : "Show Notes"}
          </button>
        </div>
      </form>

      {showNotes && notes.length > 0 && (
        <div className="notes">
          <h3>Notes</h3>
          {notes.map((n) => (
            <div key={n.id} className="note-item">
              <div className="note-header">
                <div className="note-author">
                  {n.username} {n.surname}
                </div>
                {n.dateTime && (
                  <div className="note-date">
                    {new Date(n.dateTime).toLocaleDateString()}{" "}
                    {new Date(n.dateTime).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="note-content">{n.note}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Guestbook;
