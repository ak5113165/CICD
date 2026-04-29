import {useContext, useState} from "react";
import {Navigate} from "react-router-dom";
import {UserContext} from "../UserContext";
import {backendUrl} from "../api";

export default function EditProfilePage() {
  const {userInfo, setUserInfo} = useContext(UserContext);
  const [username, setUsername] = useState(userInfo?.username || '');
  const [password, setPassword] = useState('');
  const [redirect, setRedirect] = useState(false);

  async function updateProfile(ev) {
    ev.preventDefault();
    const response = await fetch(`${backendUrl}/profile`, {
      method: 'PUT',
      body: JSON.stringify({username, password}),
      headers: {'Content-Type':'application/json'},
      credentials: 'include',
    });
    if (response.ok) {
      const updatedUser = await response.json();
      setUserInfo(updatedUser);
      setRedirect(true);
    } else {
      alert('Update failed');
    }
  }

  if (!userInfo) {
    return <Navigate to="/login" />;
  }

  if (redirect) {
    return <Navigate to="/profile" />;
  }

  return (
    <form className="edit-profile" onSubmit={updateProfile}>
      <h1>Edit Profile</h1>
      <input type="text"
             placeholder="username"
             value={username}
             onChange={ev => setUsername(ev.target.value)}/>
      <input type="password"
             placeholder="password"
             value={password}
             onChange={ev => setPassword(ev.target.value)}/>
      <button>Update Profile</button>
    </form>
  );
}