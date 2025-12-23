import type { NextPage } from "next";
import Head from "next/head";
import { ManageView } from "../views";
import React from "react";

const Manage: NextPage = (props) => {
    return (
        <div className="w-full p-5">
            <Head>
                <title>Xandminer - Manage pNode</title>
                <meta
                    name="description"
                    content="Xandminer - Manage pNode"
                />
            </Head>
            <ManageView />
        </div>
    );
};

export default Manage;
