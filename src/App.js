import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Amplify, Storage } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation, updateNote as updateNoteMutation } from './graphql/mutations';
import awsExports from './aws-exports';
Amplify.configure(awsExports);

const initialFormState = { name: '', description: '' }

function App({ signOut, user }) {

  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [apiEC2Data, setEC2Data] = useState("");

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async note => {
      if (note.image) {
        const image = await Storage.get(note.image);
        note.image = image;
      }
      return note;
    }))
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    const result = await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    setNotes([ ...notes, {...result.data.createNote, ...formData} ]);
    setFormData(initialFormState);
  }

  async function deleteNote(note) {
    const newNotesArray = notes.filter(n => n.id !== note.id);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id:note.id } }});
    setNotes(newNotesArray);
  }

  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }

  async function callEC2(){
    fetch( "http://ec2-44-201-167-255.compute-1.amazonaws.com:8080/hello", { method:"GET"})
    .then(response => {
      //依回傳內容轉成需要的型態 
      return response.text()
    })
    .then(response => {
          /*接到request data後要做的事情*/
          setEC2Data(response);
    })
    .catch(e => {
        /*發生錯誤時要做的事情*/
    })
  }
  

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value})}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value})}
        placeholder="Note description"
        value={formData.description}
      />
      <input
        type="file"
        onChange={onChange}
      />
      <button onClick={createNote}>Create Note</button>
      <div style={{marginBottom: 30}}>
        {
          notes.map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              {
                note.image && <img src={note.image} style={{width: 400}} />
              }
              <button onClick={() => deleteNote(note)}>Delete note</button>
            </div>
          ))
        }
      </div>
      <button onClick={callEC2}>Call API</button>
      <p>{apiEC2Data}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

export default withAuthenticator(App);