 


import './App.css';
import axios from "axios";
import { useState, useCallback, useEffect, useRef } from 'react';

function App() {
  const recognitionRef = useRef(null);
  const isManualStopRef = useRef(false);

  const [info, setInfo] = useState({
    isRecording: false,
    loading: false,
    statusMsg: "",
  });

  const [tasks, setTasks] = useState([]);

  // API call handler
  const handleApiCall = useCallback(async (voiceText) => {
    try {
      setInfo((prev) => ({
        ...prev,
        loading: true,
        statusMsg: "Processing your request...",
      }));

      const payload = { voiceText };

      const response = await axios.post(
        "http://localhost:5000/tasks/create",
        payload
      );

      console.log("API Response:", response.data);

      setInfo((prev) => ({
        ...prev,
        statusMsg: response.data.message || "Success!",
      }));

      if (response.data.task) {
        setTasks((prev) => [...prev, response.data.task]);
      }

      if (response.data.tasks) {
        setTasks(response.data.tasks);
      }

    } catch (error) {
      console.error("API Error:", error);

      if (error.response?.status === 503) {
        setInfo((prev) => ({
          ...prev,
          statusMsg: "AI service busy hai, thodi der mein phir try karein 🙏",
        }));
      } else if (error.response?.status === 500) {
        setInfo((prev) => ({
          ...prev,
          statusMsg: "Server mein kuch error aaya, phir try karein",
        }));
      } else {
        setInfo((prev) => ({
          ...prev,
          statusMsg: "Kuch galat ho gaya, phir try karein",
        }));
      }
    } finally {
      setInfo((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log("Speech recognition not supported");
      
      // ✅ FIX: setTimeout se defer kiya
      setTimeout(() => {
        setInfo((prev) => ({
          ...prev,
          statusMsg: "Ye browser speech recognition support nahi karta",
        }));
      }, 0);
      
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log("Sunna shuru hua...");
      setInfo((prev) => ({
        ...prev,
        statusMsg: "Sun rahe hain... Ab boliye 🎤",
      }));
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Transcript:", transcript);

      setInfo((prev) => ({
        ...prev,
        statusMsg: `Aapne bola: "${transcript}"`,
      }));

      handleApiCall(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      if (event.error === "no-speech") {
        setInfo((prev) => ({
          ...prev,
          isRecording: false,
          statusMsg: "Kuch suna nahi gaya. Phir try karein.",
        }));
      } else if (event.error === "not-allowed") {
        setInfo((prev) => ({
          ...prev,
          isRecording: false,
          statusMsg: "Microphone permission allow karein browser settings mein.",
        }));
      } else if (event.error === "audio-capture") {
        setInfo((prev) => ({
          ...prev,
          isRecording: false,
          statusMsg: "Microphone nahi mil raha. Device check karein.",
        }));
      } else {
        setInfo((prev) => ({
          ...prev,
          isRecording: false,
          statusMsg: `Error: ${event.error}`,
        }));
      }
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      setInfo((prev) => ({
        ...prev,
        isRecording: false,
      }));
      isManualStopRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [handleApiCall]);

  // Mic button click handler
  const handleMicClick = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return console.log("Speech recognition not supported");
    }

    if (info.isRecording) {
      isManualStopRef.current = true;
      recognition.stop();
    } else {
      try {
        recognition.start();
        setInfo((prev) => ({
          ...prev,
          isRecording: true,
          statusMsg: "",
        }));
      } catch (error) {
        console.error("Start error:", error);
        setInfo((prev) => ({
          ...prev,
          statusMsg: "Recognition start nahi ho paya",
        }));
      }
    }
  }, [info.isRecording]);

  // Fetch all tasks
  const fetchAllTasks = useCallback(async () => {
    try {
      setInfo((prev) => ({ ...prev, loading: true }));

      const response = await axios.get("http://localhost:5000/tasks");

      setTasks(response.data.tasks || []);
      setInfo((prev) => ({
        ...prev,
        statusMsg: "Tasks loaded successfully",
      }));
    } catch (error) {
      console.error("Fetch tasks error:", error);
      setInfo((prev) => ({
        ...prev,
        statusMsg: "Tasks fetch nahi ho payi",
      }));
    } finally {
      setInfo((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>🎙️ Voice Task Manager</h1>

      <button
        onClick={handleMicClick}
        style={{
          ...styles.micButton,
          backgroundColor: info.isRecording ? "#ff4444" : "#4CAF50",
        }}
        disabled={info.loading}
      >
        {info.isRecording ? "🎙️ Mic Band Karein" : "🎤 Mic Use Karein"}
      </button>

      {info.loading && (
        <div style={styles.loadingSpinner}>
          <p>⏳ Processing...</p>
        </div>
      )}

      {info.statusMsg && !info.loading && (
        <p style={styles.statusMsg}>{info.statusMsg}</p>
      )}

      <button onClick={fetchAllTasks} style={styles.refreshButton}>
        🔄 Refresh Tasks
      </button>

      <div style={styles.taskListContainer}>
        <h2 style={styles.taskListHeading}>
          📋 Tasks ({tasks.length})
        </h2>

        {tasks.length === 0 ? (
          <p style={styles.emptyMsg}>Koi task nahi hai abhi tak</p>
        ) : (
          <ul style={styles.taskList}>
            {tasks.map((task) => (
              <li key={task._id} style={styles.taskItem}>
                <strong>{task.title}</strong>
                {task.description && (
                  <p style={styles.taskDescription}>{task.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginTop: "50px",
    fontFamily: "Arial, sans-serif",
    maxWidth: "600px",
    margin: "50px auto",
    padding: "20px",
  },
  heading: {
    color: "#333",
    marginBottom: "30px",
  },
  micButton: {
    padding: "15px 30px",
    fontSize: "16px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  loadingSpinner: {
    marginTop: "15px",
    color: "#2196F3",
    fontWeight: "bold",
  },
  statusMsg: {
    marginTop: "15px",
    color: "#666",
    fontSize: "15px",
    padding: "10px",
    backgroundColor: "#f5f5f5",
    borderRadius: "5px",
  },
  refreshButton: {
    marginTop: "20px",
    padding: "10px 20px",
    fontSize: "14px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  taskListContainer: {
    marginTop: "30px",
    textAlign: "left",
  },
  taskListHeading: {
    color: "#333",
    borderBottom: "2px solid #ddd",
    paddingBottom: "10px",
  },
  emptyMsg: {
    color: "#999",
    fontStyle: "italic",
  },
  taskList: {
    listStyle: "none",
    padding: 0,
  },
  taskItem: {
    backgroundColor: "#f9f9f9",
    padding: "15px",
    marginBottom: "10px",
    borderRadius: "8px",
    borderLeft: "4px solid #4CAF50",
  },
  taskDescription: {
    color: "#666",
    fontSize: "14px",
    marginTop: "5px",
  },
};

export default App;
