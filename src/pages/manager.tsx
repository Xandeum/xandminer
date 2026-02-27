import type { NextPage } from "next";
import Head from "next/head";
import { ManagerView } from "../views";
import React from "react";

const Manager: NextPage = (props) => {
    return (
        <div className="w-full p-5">
            <Head>
                <title>Xandminer - Manage pNode</title>
                <meta
                    name="description"
                    content="Xandminer - Manage pNode"
                />
            </Head>
            <ManagerView />
        </div>
    );
};

export default Manager;
