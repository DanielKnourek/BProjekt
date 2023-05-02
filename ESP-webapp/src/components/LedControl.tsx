const sideBar: React.FC = () => {
  const submitAction = (e: React.FormEvent) => {
    e.preventDefault();
  };
  return (
    <div className="m-4 rounded-xl bg-gray-400 p-4">
      Control on board LED
      <form onSubmit={submitAction}>
        <button
          className="m-1 rounded-sm bg-green-600 p-1 text-white"
          type="submit"
          name="led-on"
          onClick={() => {
            fetch("http://192.168.137.183:80/api/led?LED1=1");
          }}
        >
          LED set on
        </button>
        <button
          className="m-1 rounded-sm bg-red-600 p-1  text-white"
          type="submit"
          name="led-on"
          onClick={() => {
            fetch("http://192.168.137.183:80/api/led?LED1=0");
          }}
        >
          LED set off
        </button>
      </form>
    </div>
  );
};

export default sideBar;
