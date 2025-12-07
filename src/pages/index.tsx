import type { NextPage } from "next";
import Head from "next/head";
import { HomeView } from "../views";
import React from "react";

const Home: NextPage = (props) => {
  return (
    <div className="w-full p-5">
      <Head>
        <title>Xandminer</title>
        <meta
          name="description"
          content="Xandminer"
        />
      </Head>
      <HomeView />
    </div>
  );
};

export default Home;
