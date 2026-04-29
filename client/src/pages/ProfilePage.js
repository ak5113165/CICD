import {useContext, useEffect, useState} from "react";
import {UserContext} from "../UserContext";
import {backendUrl} from "../api";
import Post from "../Post";
import {Link} from "react-router-dom";

export default function ProfilePage() {
  const {userInfo} = useContext(UserContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userInfo?.id) {
      fetch(`${backendUrl}/post`)
        .then(response => response.json())
        .then(allPosts => {
          const userPosts = allPosts.filter(post => post.author._id === userInfo.id);
          setPosts(userPosts);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [userInfo]);

  if (!userInfo) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="profile-page">
      <h1>Profile</h1>
      <div className="user-info">
        <p><strong>Username:</strong> {userInfo.username}</p>
        <p><strong>User ID:</strong> {userInfo.id}</p>
        <Link to="/edit-profile" className="edit-btn">Edit Profile</Link>
      </div>
      <h2>Your Posts</h2>
      {loading ? (
        <div>Loading posts...</div>
      ) : posts.length > 0 ? (
        posts.map(post => <Post key={post._id} {...post} />)
      ) : (
        <div>No posts yet.</div>
      )}
    </div>
  );
}