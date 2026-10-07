const Loading = ({ text = "Loading..." }) => {
  return (
    <div className="loading-container">
      <div className="loader" />
      <p>{text}</p>
    </div>
  );
};

export default Loading;