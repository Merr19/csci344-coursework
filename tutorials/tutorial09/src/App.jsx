import React from "react";
import Card from "./components/Card";
import AntCard from "./components/AntCard";
import { Button, Tag } from "antd";

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>

      <div style={{ display: "flex", gap: "16px" }}>
      <Card
        name="Alien cat"
        image_url="https://i.pinimg.com/736x/46/f4/88/46f4885495c1ed7ca2dbfd4787b06bb6.jpg"
        description="A cute alien cat."
      />

      <Card
        name="Tounge cat"
        image_url="https://i.pinimg.com/736x/e2/2c/ef/e22cef5fd63b77362b003a09265fda15.jpg"
        description="Tounge Cat"
      />

      <AntCard
        name="Jail Cat"
        image_url="https://i.pinimg.com/736x/f0/84/db/f084db2a724fed85b209fd0e87f32081.jpg"
        description="Cat Mugshot"
      />
     </div>

     <div style={{ display: "flex", gap: "12px" }}>
        <Button type="primary">Click Me!</Button>
        <Button type="dashed">Another Button</Button>
        <Tag color="blue">Cat Lover</Tag>
        <Tag color="red">Danger Cat</Tag>
      </div>
    </div>
    
  );
}

export default App;