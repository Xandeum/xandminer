import type { NextPage } from "next";
import Head from "next/head";
import { StoreView } from "../views";
import React from "react";

const Store: NextPage = (props) => {
    return (
        <div className="w-full md:w-3/4">
            <Head>
                <title>Buy a PNode</title>
                <meta
                    name="description"
                    content="PNode Store"
                />
            </Head>
            <StoreView />
        </div>
    );
};

export default Store;
