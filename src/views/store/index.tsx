import { FC } from "react";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { notify } from "../../utils/notifications";
import * as anchor from '@project-serum/anchor';

import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createMintToInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token"
import { Keypair, Transaction, sendAndConfirmTransaction, Connection, clusterApiUrl } from "@solana/web3.js";

import * as fs from 'fs';

import mintkeypair from "../../mint.json";

export const StoreView: FC = ({ }) => {

    const wallet = useWallet();
    const { connection } = useConnection();
    // const connection = new Connection(clusterApiUrl("devnet"));

    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

    const onBuyPNode = async () => {

        try {

            if (!wallet.publicKey) {
                notify({
                    message: "Error buying PNode",
                    description: "Wallet not connected",
                    type: "error",
                });
                return;
            }

            const publicKey = new Uint8Array(Object.values(mintkeypair._keypair.publicKey));
            const secretKey = new Uint8Array(Object.values(mintkeypair._keypair.secretKey));

            console.log("publicKey >>> ", publicKey)
            console.log("secretKey >>> ", secretKey)

            const mint = new Keypair({ publicKey, secretKey });

            console.log("mint >>> ", mint)

            // const kp = JSON.parse(fs.readFileSync("wallet2.json", "utf-8"));

            // const wallet = Keypair.fromSecretKey(Uint8Array.from(kp));


            const ata = await getAssociatedTokenAddress(
                mint.publicKey,
                wallet.publicKey,
                undefined,
                TOKEN_2022_PROGRAM_ID
            );

            console.log("ata >>> ", ata)

            const ataInstruction = createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                ata,
                wallet.publicKey,
                mint.publicKey,
                TOKEN_2022_PROGRAM_ID
            );

            const mintTo = createMintToInstruction(
                mint.publicKey,
                ata,
                mint.publicKey,
                1,
                undefined,
                TOKEN_2022_PROGRAM_ID
            );

            const tx = new Transaction().add(ataInstruction, mintTo);
            tx.recentBlockhash = (
                await provider.connection.getLatestBlockhash()
            ).blockhash;

            tx.feePayer = wallet.publicKey;

            const signedTransaction = await wallet.signTransaction(tx);

            const txid = await connection.sendRawTransaction(signedTransaction.serialize(), { skipPreflight: true });
            await connection.confirmTransaction(txid, "confirmed");

            console.log("Transaction confirmed", txid);

        } catch (error) {
            console.error("Error buying PNode >>> ", error)
            notify({
                message: "Error buying PNode",
                description: `${error}`,
                type: "error",
            });
        }
    }

    return (
        <div className="flex mx-auto flex-col items-center justify-center w-full p-4 min-h-[75vh]">
            <button className="btn bg-[#FDA31B] hover:bg-[#622657] text-white" onClick={onBuyPNode}>Buy a PNode</button>
        </div>
    )
}
