import React from "react";
import { Card } from "antd";

export default function AntCard({ name, image_url, description }) {
  return (
    <Card
      style={{ width: 300, margin: "16px" }}
      cover={<img alt={name} src={image_url} />}
    >
      <Card.Meta title={name} description={description} />

      
    </Card>
  );
}