﻿using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using ConsoleApp_2;

namespace UnitTestProject_for_ConsoleApp2
{
    [TestClass]
    public class UnitTest1 
    {
        [TestMethod]
        public void TestMethod1()
        {
            Class1 c2 = new Class1();
            double result = c2.Addition(5, 5);
            Assert.AreEqual(result, 10);
        }

        [TestMethod]
        public void TestMethod2()
        {
            Class1 c = new Class1();
            int res = c.Multip(3, 4);
            Assert.AreEqual(12, res);
        }

        [TestMethod]

        public void TestMethod3()
        {
            Class1 cc = new Class1();
            int resultt = cc.Div(5, 10);
            Assert.AreEqual(2, resultt);
        }
    }
}
