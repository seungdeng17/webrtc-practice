import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import styled from "styled-components";

export default function App() {
  const socket = useRef();
  const myPC = useRef(new RTCPeerConnection(PEER_CONFIG));

  const myVideo = useRef();
  const [myStream, setMyStream] = useState(null);
  useEffect(() => {
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMyStream(stream);
      if (myVideo.current) myVideo.current.srcObject = stream;
      stream.getTracks().forEach((track) => {
        myPC.current.addTrack(track, stream);
      });
    })();

    myPC.current.addEventListener("connectionstatechange", () => {
      if (myPC.current.connectionState === "connected") {
        console.log("Peer connected!!");
      }
    });
  }, []);

  const [myId, setMyId] = useState("");
  const [users, setUsers] = useState(null);
  const [offer, setOffer] = useState(null);
  const [caller, setCaller] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  useEffect(() => {
    socket.current = io.connect("https://localhost:443");
    socket.current.on("setMyId", (myId) => setMyId(myId));
    socket.current.on("users", (users) => setUsers(users));
    socket.current.on("sendOfferToCallee", async ({ caller, offer }) => {
      if (offer) {
        setOffer(offer);
        setCaller(caller);
        setIsCalling(true);
      }
    });
    socket.current.on("sendCandidateToTarget", async ({ candidate }) => {
      if (candidate) {
        try {
          await myPC.current.addIceCandidate(candidate);
        } catch (e) {}
      }
    });
  }, []);

  async function callPeer(callee) {
    socket.current.on("sendAnswerToCaller", async ({ answer }) => {
      if (answer) {
        const remoteDesc = new RTCSessionDescription(answer);
        await myPC.current.setRemoteDescription(remoteDesc);
      }
    });
    const offer = await myPC.current.createOffer();
    await myPC.current.setLocalDescription(offer);
    socket.current.emit("offer", { callee, offer });

    myPC.current.addEventListener(
      "icecandidate",
      iceCandidateHandler.bind(null, callee)
    );
  }

  async function onClickAccept() {
    myPC.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await myPC.current.createAnswer();
    await myPC.current.setLocalDescription(answer);
    socket.current.emit("answer", { caller, answer });
    setIsCalling(false);

    myPC.current.addEventListener(
      "icecandidate",
      iceCandidateHandler.bind(null, caller)
    );
  }

  function iceCandidateHandler(target, { candidate }) {
    if (candidate) {
      socket.current.emit("new-ice-candidate", { target, candidate });
    }
  }

  return (
    <div>
      <p>ID: {myId}</p>
      {myStream && (
        <Video ref={myVideo} muted autoPlay playsinline controls={false} />
      )}
      {users &&
        users.map((id) => {
          return (
            id !== myId && (
              <button type="button" key={id} onClick={() => callPeer(id)}>
                {id}
              </button>
            )
          );
        })}
      {isCalling && (
        <div>
          <p>{caller} is calling you</p>
          <button type="button" onClick={onClickAccept}>
            Accept
          </button>
        </div>
      )}
    </div>
  );
}

const PEER_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const Video = styled.video`
  width: 300px;
  height: 200px;
  border: 1px solid red;
`;
