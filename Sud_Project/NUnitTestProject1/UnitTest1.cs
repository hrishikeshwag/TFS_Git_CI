using NUnit.Framework;

namespace Tests
{
    public class Tests
    {
        [SetUp]
        public void Setup()
        {
        }

        [Test]
        public void Test1()
        {
            Sud_Project.Program d = new Sud_Project.Program();
            int i = d.sub(9, 6);
            Assert.AreEqual(3, i);
        }
    }
}